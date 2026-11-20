# Evidence for visible pull requests

Start local previews from the PR merge base and the final product revision. Use Playwright and Chromium to capture each affected screen:

```sh
timeout --kill-after=5s 240s node scripts/pr-evidence-capture.mjs http://127.0.0.1:4173/ http://127.0.0.1:4174/ home
```

Commit the captures and use the [PR evidence template](docs/PR_EVIDENCE.md). Run the verifier before handoff:

```sh
python3 scripts/pr-evidence-check.py https://github.com/OWNER/REPO/pull/NUMBER
```
