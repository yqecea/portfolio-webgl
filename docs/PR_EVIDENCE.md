# Evidence for a visible pull request

A visible change needs a before and after for every affected screen. Use the same route, data, viewport and browser settings for the two versions. Start local previews at the PR merge base and the final product revision. Run this once per screen with Playwright and Chromium available:

```sh
timeout --kill-after=5s 240s node scripts/pr-evidence-capture.mjs http://127.0.0.1:4173/ http://127.0.0.1:4174/ home
```

Commit the four PNGs in `docs/pr-evidence/home/`. Run the checks on the final PR head after adding the evidence files. Check that the evidence-only commit leaves the product inputs used for the capture identical. Pin the image URLs to the final head SHA and embed them in the PR body:

```md
| Screen | Phone before | Phone after | Desktop before | Desktop after |
| --- | --- | --- | --- | --- |
| Home | ![Home before, phone](https://raw.githubusercontent.com/OWNER/REPO/HEAD/docs/pr-evidence/home/before-phone.png) | ![Home after, phone](https://raw.githubusercontent.com/OWNER/REPO/HEAD/docs/pr-evidence/home/after-phone.png) | ![Home before, desktop](https://raw.githubusercontent.com/OWNER/REPO/HEAD/docs/pr-evidence/home/before-desktop.png) | ![Home after, desktop](https://raw.githubusercontent.com/OWNER/REPO/HEAD/docs/pr-evidence/home/after-desktop.png) |
```

If a gesture, focus movement, navigation or animation changed, record that scenario before and after in one MP4 or WebM. Commit it under the screen directory and link to the raw file at the head SHA. If interactions stay the same, explain why in `interaction` with the `None: ` prefix.

Copy this block into the PR body. Replace the example values with measured results. Use full Git SHAs. If a check is meant to fail, supply `expected` and the observed `exit`. Include at least one successful check.

````md
```pr-evidence
base = "FULL_PR_MERGE_BASE_SHA"
head = "FULL_PR_HEAD_SHA"
screens = ["home"]
interaction = "None: heading copy changed"
not_checked = "Physical iPhone and installed PWA"

[[checks]]
command = "npm run verify"
exit = 0
observed = "Heading renders and the existing links work on the exact head."

[[metrics]]
name = "Heading wraps at 390px"
before = 2
after = 1
unit = "lines"
method = "Chromium at 390px, same font and test data"
```
````

For an interaction, use `interaction = "Menu opens after a swipe"` and add `video = "docs/pr-evidence/home/menu.mp4"` before the first `[[checks]]` entry.

Run the same verifier that Actions and Hermes H use:

```sh
python3 scripts/pr-evidence-check.py https://github.com/OWNER/REPO/pull/NUMBER
```

Exit 0 means the evidence passed or the diff contains only documentation, tests or repository tooling exempted by the script. Exit 1 means a check failed. Exit 2 means GitHub data was unavailable, changed during the run or exceeded the time limit. Both failure codes block acceptance.

The check reads GitHub's current PR body and complete file listing, compares its full head and merge base, and checks the images in GitHub-rendered HTML. It fetches media without GitHub credentials, so the same media can open in a mobile GitHub client. Review the frames, numbers, commands and scenario coverage. The machine check validates the submitted evidence structure, availability, revision and image dimensions. It cannot tell whether a command was actually run or a frame shows the intended product behavior.

The workflow runs as the read-only `pr-evidence` check. It uses the verifier from the base branch after rollout. Make that check required in branch protection to block merging, and require review of changes to the workflow and checker. A GitHub check does not identify a PR body version. The workflow reruns on edits and H revalidates the current body before handoff.
