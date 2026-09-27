# Validation record

Validated locally on 2026-09-27 UTC using Node.js 24.16.0, Playwright 1.63.0, and Chromium 153.0.8010.12.

- **51/51 deterministic engine checks passed.** They exercise supported formats and categories, all five result classes, contextual and contradictory policy language, source quote integrity, invalid or excessive inputs, sensitive-value masking, and safe exports.
- **19/19 browser checks passed.** They cover all three end-to-end examples, policy/capture imports, malformed captures, renewed confirmation after edits, manually selected claims, state reset, JSON download, SHA-256 fingerprints, local hostname inspection, dialog keyboard behavior, no unexpected network requests, no browser storage, and responsive widths of 390, 768, and 1440 pixels.
- **Real HTTP integration passed.** A controlled local fixture emitted a POST request from Chromium using synthetic coordinates, an email and a device ID. Playwright recorded the actual HAR; the engine returned two potential contradictions and one data-type match. See `fixtures/` and `qa/record-capture.mjs`.
- **Optional WebMCP integration:** registration, valid state changes, summary read-back and invalid-input rejection were checked using a browser registry harness. Native browser WebMCP interoperability was not available to verify.
- **Manual visual review:** desktop and mobile evidence screens were inspected. Export and error flows were exercised in the browser. The demonstration records the actual application.

This is a regression and integration record for the prototype, not an independently annotated accuracy benchmark or legal assessment. Bundled values and app identities are synthetic. No claim of real-world precision, recall, users or measured impact is made.

## Reproduce

```sh
npm install
npx playwright install chromium
npm test
npm run check
npm run test:capture
# Start npm start in another terminal, then:
npm run test:browser
```

`PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an existing compatible browser. Browser screenshots and detailed QA output are written to ignored `artifacts/`. The capture integration regenerates the synthetic fixture files.
