# Browser regression checks

Install `python -m pip install -r tests/requirements-browser.txt`, then `python -m playwright install chromium`. Run `python tests/browser_test.py`. The test serves this checkout on a temporary loopback port under `/preview/` and uses an isolated browser context. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only to use an existing local Chromium executable.

CI installs the matching Chromium browser and Linux dependencies. Failed checks retain a screenshot and Playwright trace in `test-results/`; CI uploads these for seven days. Tests use synthetic/demo data.
