#!/usr/bin/env python3
"""Validate a GitHub PR's visual evidence. Never run code from the PR."""

import argparse
import base64
import json
import re
import signal
import subprocess
import tempfile
import tomllib
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import HTTPRedirectHandler, Request, build_opener

PR_URL = re.compile(r"https://github\.com/([\w.-]+/[\w.-]+)/pull/([1-9][0-9]*)/?", re.ASCII)
SHA = re.compile(r"[0-9a-f]{40}")
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
SCREENSHOTS = ("before-phone", "after-phone", "before-desktop", "after-desktop")
RAW = "https://raw.githubusercontent.com/"
EVIDENCE = "docs/pr-evidence/"
IMAGE_LIMIT = 12 * 1024 * 1024
VIDEO_LIMIT = 24 * 1024 * 1024
MAX_MEDIA = 64
NON_VISUAL_PATHS = {
    "AGENTS.md", "CHANGELOG.md", "LICENSE", "README.md", ".gitignore",
    "scripts/pr-evidence-check.py", "scripts/pr-evidence-capture.mjs",
}
NON_VISUAL_PREFIXES = (".github/", "docs/", "tests/")


class EvidenceError(Exception):
    pass


class EvidenceTimeout(Exception):
    pass


class RenderedBody(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.images = set()
        self.links = set()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "img":
            self.images.add(attributes.get("data-canonical-src") or attributes.get("src", ""))
        if tag == "a":
            self.links.add(attributes.get("href", ""))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def github(endpoint, *options):
    result = subprocess.run(
        ["gh", "api", "--hostname", "github.com", endpoint, *options],
        text=True, capture_output=True, check=False, timeout=25,
    )
    if result.returncode:
        raise EvidenceError(f"gh api failed for {endpoint} (exit {result.returncode})")
    return result.stdout.strip() if "--jq" in options else json.loads(result.stdout)


def pull(repo, number):
    return github(f"repos/{repo}/pulls/{number}", "-H", "Accept: application/vnd.github.full+json")


def merge_base(repo, target, head):
    commit = github(f"repos/{repo}/compare/{target}...{head}?per_page=1", "--jq", ".merge_base_commit.sha")
    if not SHA.fullmatch(commit):
        raise EvidenceError("GitHub did not return a merge-base SHA")
    return commit


def vercel_config(repo, commit):
    file = github(f"repos/{repo}/contents/vercel.json?ref={commit}")
    if file.get("type") != "file" or file.get("encoding") != "base64":
        raise EvidenceError("GitHub did not return vercel.json as a file")
    config = json.loads(base64.b64decode(file["content"]))
    if not isinstance(config, dict):
        raise EvidenceError("vercel.json is not a JSON object")
    return config


def preview_settings(config):
    git = config.get("git")
    return git.get("deploymentEnabled") if isinstance(git, dict) else None


def without_preview_entry(config, branch):
    rest = config.copy()
    if rest.get("$schema") == "https://openapi.vercel.sh/vercel.json":
        del rest["$schema"]
    settings = preview_settings(rest)
    if isinstance(settings, dict):
        git = rest["git"].copy()
        other_branches = {key: value for key, value in settings.items() if key != branch}
        if other_branches:
            git["deploymentEnabled"] = other_branches
        else:
            del git["deploymentEnabled"]
        if git:
            rest["git"] = git
        else:
            del rest["git"]
    return rest


def nonvisual_vercel_change(repo, file, pr):
    status = file.get("status")
    branch = pr["head"]["ref"]
    base = pr["base"]
    if (
        status not in {"added", "modified"}
        or file.get("previous_filename")
        or not re.fullmatch(r"[a-zA-Z0-9._/-]+", branch)
        or branch in {base["ref"], base["repo"]["default_branch"]}
    ):
        return False

    head = pr["head"]
    try:
        after = vercel_config(head["repo"]["full_name"], head["sha"])
        settings = preview_settings(after)
        if not isinstance(settings, dict) or settings.get(branch) is not False:
            return False
        before = vercel_config(repo, merge_base(repo, base["sha"], head["sha"])) if status == "modified" else {}
    except (EvidenceError, ValueError, KeyError):
        # Unavailable configuration still needs evidence.
        return False
    return (
        json.dumps(without_preview_entry(before, branch), sort_keys=True)
        == json.dumps(without_preview_entry(after, branch), sort_keys=True)
    )


def visible_files(files, repo, pr):
    return sorted({
        path
        for file in files
        if file["filename"] != "vercel.json" or not nonvisual_vercel_change(repo, file, pr)
        for path in (file["filename"], file.get("previous_filename"))
        if path and path not in NON_VISUAL_PATHS and not path.startswith(NON_VISUAL_PREFIXES)
    })


def evidence_block(body):
    blocks = []
    fence = None
    lines = None
    for line in body.splitlines():
        match = re.fullmatch(r" {0,3}(`{3,}|~{3,})(.*)", line)
        if fence:
            if match and match[1][0] == fence[0] and len(match[1]) >= len(fence) and not match[2].strip():
                if lines is not None:
                    blocks.append("\n".join(lines))
                fence, lines = None, None
            elif lines is not None:
                lines.append(line)
        elif match:
            fence = match[1]
            if match[2].strip() == "pr-evidence":
                lines = []
    if len(blocks) != 1 or lines is not None:
        raise EvidenceError("PR body needs one closed ```pr-evidence block")
    try:
        return tomllib.loads(blocks[0])
    except tomllib.TOMLDecodeError as exc:
        raise EvidenceError(f"Invalid pr-evidence TOML ({exc})") from None


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def table_rows(value, text_fields, number_fields):
    return isinstance(value, list) and bool(value) and all(
        isinstance(row, dict)
        and all(nonempty(row.get(field)) for field in text_fields)
        and all(type(row.get(field)) in (int, float) for field in number_fields)
        for row in value
    )


def inspect_manifest(manifest, rendered, prefix, head, base):
    failures = []
    media = {}
    if manifest.get("head") != head:
        failures.append(f"head must match current PR head {head}")
    if manifest.get("base") != base:
        failures.append(f"base must match current PR merge base {base}")
    if not nonempty(manifest.get("not_checked")):
        failures.append("not_checked needs an explicit scope or limitation")

    screens = manifest.get("screens")
    if (
        not isinstance(screens, list) or not screens
        or not all(isinstance(screen, str) and SLUG.fullmatch(screen) for screen in screens)
        or len(set(screens)) != len(screens)
    ):
        failures.append("screens must list distinct affected screen slugs")
    else:
        for screen in screens:
            for name in SCREENSHOTS:
                path = f"{EVIDENCE}{screen}/{name}.png"
                url = prefix + path
                if url not in rendered.images:
                    failures.append(f"Embed a Markdown image for {path} at the current head SHA")
                media[url] = "image"

    interaction = manifest.get("interaction")
    if not nonempty(interaction):
        failures.append("interaction needs the scenario shown in video or a reason there is no changed interaction")
    elif not interaction.startswith("None: "):
        video = manifest.get("video")
        if not isinstance(video, str) or not re.fullmatch(
            r"docs/pr-evidence/[a-z0-9-]+/[a-z0-9-]+\.(?:mp4|webm)", video
        ):
            failures.append("Changed interactions need a committed MP4 or WebM recording")
        else:
            url = prefix + video
            if url not in rendered.links:
                failures.append(f"Link the interaction video {video} in the PR body")
            media[url] = "video"
    elif not interaction.removeprefix("None: ").strip():
        failures.append("Give a reason after 'None: ' in interaction")

    checks = manifest.get("checks")
    if not table_rows(checks, ("command", "observed"), ("exit",)) or not all(
        type(row["exit"]) is int and 0 <= row["exit"] <= 255
        and type(row.get("expected", 0)) is int and row["exit"] == row.get("expected", 0)
        for row in checks
    ) or not any(row["exit"] == 0 for row in checks):
        failures.append("checks need command, observed result and matching numeric exit code, with at least one exit 0")

    metrics = manifest.get("metrics")
    if not table_rows(metrics, ("name", "unit", "method"), ("before", "after")) or not all(
        all(float("-inf") < row[key] < float("inf") for key in ("before", "after")) for row in metrics
    ):
        failures.append("metrics need measured numeric before and after, name, unit and method")
    return failures, media


def image_format(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif", ".gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return "", ""


def fetch_media(url, kind):
    request = Request(url, headers={"User-Agent": "PR-Evidence/1"})
    with build_opener(NoRedirect()).open(request, timeout=8) as response:
        mime = response.headers.get_content_type()
        limit = IMAGE_LIMIT if kind == "image" else VIDEO_LIMIT
        if response.status != 200:
            raise EvidenceError(f"HTTP {response.status}")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise EvidenceError(f"media exceeds {limit // 1024 // 1024} MiB")
    if kind == "image":
        actual, extension = image_format(data)
        if not actual or mime != actual or (url.endswith(".png") and actual != "image/png"):
            raise EvidenceError(f"expected an image with matching bytes, got {mime}")
    else:
        extension = Path(url).suffix
        signatures = {".mp4": (data[4:8] == b"ftyp", "video/mp4"),
                      ".webm": (data.startswith(b"\x1a\x45\xdf\xa3"), "video/webm")}
        valid, actual = signatures[extension]
        if not valid or mime not in (actual, "application/octet-stream"):
            raise EvidenceError(f"expected {actual} recording, got {mime}")
    return data, extension


def verify_screenshot_dimensions(url, data):
    name = Path(url).stem
    if name not in SCREENSHOTS or f"/{EVIDENCE}" not in url:
        return
    width, height = (390, 844) if name.endswith("-phone") else (1440, 900)
    actual_width = int.from_bytes(data[16:20], "big")
    actual_height = int.from_bytes(data[20:24], "big")
    if data[12:16] != b"IHDR" or actual_width != width or actual_height < height:
        raise EvidenceError(f"expected {width}px wide and at least {height}px tall, got {actual_width}x{actual_height}")


def validate_pr(repo, number, expected_head, download_dir):
    pr = pull(repo, number)
    head, target = pr["head"]["sha"], pr["base"]["sha"]
    if not SHA.fullmatch(head) or not SHA.fullmatch(target):
        raise EvidenceError("GitHub did not return full base and head SHAs")
    if expected_head and expected_head != head:
        raise EvidenceError(f"PR head moved from {expected_head} to {head}")
    canonical = pr["base"]["repo"]["full_name"]
    if canonical.lower() != repo.lower():
        raise EvidenceError(f"GitHub returned unexpected repository {canonical}")
    body = pr["body"] or ""
    report = {"head": head, "visible_files": [], "media": [], "errors": []}
    pages = github(f"repos/{repo}/pulls/{number}/files?per_page=100", "--paginate", "--slurp")
    files = [entry for page in pages for entry in page]
    if len(files) != pr["changed_files"] or len({entry["filename"] for entry in files}) != len(files):
        raise EvidenceError("GitHub PR file listing is incomplete or changed during pagination")
    report["visible_files"] = visible_files(files, repo, pr)
    if report["visible_files"]:
        validate_visible_pr(repo, body, pr, report, download_dir)

    current = pull(repo, number)
    if (current["head"]["sha"], current["base"]["sha"], current["body"] or "") != (head, target, body):
        raise EvidenceError("PR body or revision changed during verification; rerun")
    return report


def validate_visible_pr(repo, body, pr, report, download_dir):
    rendered = RenderedBody(pr["body_html"] or "")
    head = report["head"]
    prefix = f"{RAW}{pr['base']['repo']['full_name']}/{head}/"
    errors = report["errors"]
    media = {}
    try:
        manifest = evidence_block(body)
    except EvidenceError as exc:
        errors.append(str(exc))
        errors.append("Need exact base/head, phone and desktop pairs per screen, interaction evidence, exit codes, metrics and limits")
    else:
        compare = merge_base(repo, pr["base"]["sha"], head)
        report["merge_base"] = compare
        failures, media = inspect_manifest(manifest, rendered, prefix, head, compare)
        errors.extend(failures)

    raw_image = re.compile(rf"{re.escape(RAW + repo)}/[0-9a-f]{{40}}/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif)", re.I)
    for url in sorted(rendered.images):
        if raw_image.fullmatch(url) and not {"..", "."}.intersection(url.split("/")):
            media.setdefault(url, "image")
    if len(media) > MAX_MEDIA:
        errors.append(f"At most {MAX_MEDIA} evidence files per PR")
        return
    saved = None
    total = 0
    for url, kind in media.items():
        if url not in rendered.images and kind == "image":
            continue
        if url not in rendered.links and kind == "video":
            continue
        try:
            data, extension = fetch_media(url, kind)
            if kind == "image":
                verify_screenshot_dimensions(url, data)
        except (EvidenceError, OSError) as exc:
            errors.append(f"{url}: {exc}")
            continue
        total += len(data)
        if total > 96 * 1024 * 1024:
            errors.append("Evidence exceeds 96 MiB total")
            break
        item = {"url": url, "kind": kind, "bytes": len(data)}
        if download_dir is not None:
            if saved is None:
                download_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
                saved = Path(tempfile.mkdtemp(prefix=f"{head[:12]}-", dir=download_dir))
            path = saved / f"{len(report['media']) + 1:02d}-{Path(url).stem}{extension}"
            path.write_bytes(data)
            item["path"] = str(path)
        report["media"].append(item)


def deadline_expired(signum, frame):
    raise EvidenceTimeout("PR evidence check exceeded 120 seconds")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pr_url")
    parser.add_argument("--expect-head")
    parser.add_argument("--ci", action="store_true", help="validate without saving downloads")
    parser.add_argument("--download-dir", type=Path, default=Path.home() / ".cache/pr-evidence")
    args = parser.parse_args(argv)
    match = PR_URL.fullmatch(args.pr_url)
    if not match:
        parser.error("use https://github.com/OWNER/REPO/pull/NUMBER")
    repo, number = match.groups()
    handler = signal.signal(signal.SIGALRM, deadline_expired)
    signal.alarm(120)
    try:
        report = validate_pr(repo, number, args.expect_head, None if args.ci else args.download_dir.resolve())
    except (EvidenceError, EvidenceTimeout, OSError, subprocess.TimeoutExpired, ValueError, KeyError) as exc:
        report = {"errors": [str(exc)], "visible_files": [], "media": []}
        exit_code = 2
    else:
        exit_code = int(bool(report["errors"]))
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, handler)
    report.update(pr=args.pr_url, verdict="PASS" if exit_code == 0 else "FAIL")
    print(json.dumps(report, indent=2, ensure_ascii=True))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
