import contextlib
import io
import json
import runpy
import struct
import tempfile
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/pr-evidence-check.py"
MAIN = runpy.run_path(str(SCRIPT))["main"]
REPO = "example/site"
HEAD, BASE = "a" * 40, "b" * 40
URL = f"https://github.com/{REPO}/pull/1"
PNG_ROOT = f"https://raw.githubusercontent.com/{REPO}/{HEAD}/docs/pr-evidence/home"
PHOTOS = ("before-phone", "after-phone", "before-desktop", "after-desktop")
BODY = f"""## Visual check

```pr-evidence
base = "{BASE}"
head = "{HEAD}"
screens = ["home"]
interaction = "None: static heading change"
not_checked = "Physical iPhone"
[[checks]]
command = "npm run verify"
exit = 0
observed = "The correct heading rendered at both widths."
[[metrics]]
name = "Heading wraps at 390px"
before = 2
after = 1
unit = "lines"
method = "Chromium, 390px width, same test data"
```
"""
HTML = "\n".join(f'<img src="{PNG_ROOT}/{name}.png">' for name in PHOTOS)


class EvidenceTest(unittest.TestCase):
    def run_pr(self, body=BODY, html=HTML, files=None, response_error=None,
               mime="image/png", move_body=False, wrong_size=False):
        files = files if files is not None else [{"filename": "index.html"}]
        pr = {
            "head": {"sha": HEAD}, "base": {"sha": BASE, "repo": {"full_name": REPO}},
            "body": body, "body_html": html, "changed_files": len(files),
        }
        calls = []

        def gh(command, **_):
            endpoint = command[4]
            calls.append(endpoint)
            if "/files?" in endpoint:
                result = json.dumps([files])
            elif "/compare/" in endpoint:
                result = BASE
            else:
                updated = move_body and calls.count(endpoint) == 2
                result = json.dumps(dict(pr, body="changed") if updated else pr)
            return type("Result", (), {"returncode": 0, "stdout": result})()

        def get_image(request, timeout):
            url = request.full_url
            self.assertTrue(url.startswith(PNG_ROOT))
            if response_error and "after-phone" in url:
                raise HTTPError(url, response_error, "Fixture response", {}, None)

            width, height = (390, 844) if "phone" in url else (1440, 900)
            response = io.BytesIO(
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
                + struct.pack(">II", width - int(wrong_size), height)
                if mime == "image/png" else b"<html>login</html>"
            )
            response.status = 200
            response.headers = Message()
            response.headers["Content-Type"] = mime
            return response

        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()) as out:
            with patch("subprocess.run", gh), patch("urllib.request.OpenerDirector.open", side_effect=get_image):
                status = MAIN([URL, "--download-dir", folder])
            result = json.loads(out.getvalue())
            for item in result["media"]:
                self.assertTrue(Path(item["path"]).read_bytes().startswith(b"\x89PNG"))

        return status, result

    def test_good_visible_pr(self):
        status, report = self.run_pr()
        self.assertEqual((status, report["verdict"]), (0, "PASS"))
        self.assertEqual(len(report["media"]), 4)
        self.assertEqual(report["merge_base"], BASE)

    def test_visible_pr_without_evidence(self):
        status, report = self.run_pr(body="Verified in Chrome.", html="")
        self.assertEqual((status, report["verdict"]), (1, "FAIL"))
        self.assertFalse(report["media"])

    def test_missing_or_hidden_embed(self):
        status, report = self.run_pr(html=HTML.rsplit("\n", 1)[0])
        self.assertEqual(status, 1)
        self.assertIn("after-desktop.png", str(report["errors"]))

    def test_404_and_html(self):
        for kwargs in ({"response_error": 404}, {"mime": "text/html"}, {"wrong_size": True}):
            with self.subTest(kwargs=kwargs):
                status, report = self.run_pr(**kwargs)
                self.assertEqual(status, 1)
                self.assertGreaterEqual(len(report["errors"]), 1)

    def test_stale_revision_and_missing_check_exit(self):
        for body in (BODY.replace(HEAD, BASE), BODY.replace("exit = 0\n", "")):
            with self.subTest(body=body):
                self.assertEqual(self.run_pr(body=body)[0], 1)

    def test_no_visual_files_and_renamed_visual_file(self):
        for old_name, expected in (("docs/old.md", 0), ("index.html", 1)):
            with self.subTest(old_name=old_name):
                status, _ = self.run_pr(
                    body="", html="", files=[{"filename": "docs/new.md", "previous_filename": old_name}],
                )
                self.assertEqual(status, expected)

    def test_pr_edits_during_check_require_retry(self):
        status, report = self.run_pr(move_body=True)
        self.assertEqual((status, report["verdict"]), (2, "FAIL"))
        self.assertIn("changed during verification", report["errors"][0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
