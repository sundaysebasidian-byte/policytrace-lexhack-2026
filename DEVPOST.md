# PolicyTrace

## Try it in 60 seconds
Open the [live workspace](https://policytrace-lexhack-2026.sundaysebasidian.chatgpt.site), choose **A broken promise**, review and confirm the three policy claims, then run the check. Expand a finding to see the exact policy quote and masked request evidence. Try **When evidence is missing** to see why an incomplete capture cannot establish a match. No account or API key is required.

Watch the [111-second demonstration](https://vimeo.com/1230721169), or use the [captioned player](https://policytrace-lexhack-2026.sundaysebasidian.chatgpt.site/demo.html).

## Inspiration
An app promises it never sends your location. A captured request contains coordinates. A reviewer needs to connect the two, check the context, and explain what the evidence actually supports. PolicyTrace makes that review accessible without sending the capture to another service. Prior research, including PoliCheck and PoliGraph, already studies flow-to-policy consistency; our contribution is a focused local workflow with source-linked evidence and explicit uncertainty.

## What it does
PolicyTrace is an independent static browser tool that analyzes alignment between privacy disclosures and observed HTTP archive (HAR) traffic.
- **Local-First Privacy**: Users paste or import policy text and load a HAR file. All processing occurs strictly within local browser memory with zero analytics, remote uploads, or local storage. (Standard hosting provider access requests still apply.)
- **Candidate Claim Extraction**: Identifies conservative, pattern-based candidate claims in English and Chinese. Users review and confirm or refine categories and meanings before analysis.
- **Deterministic Data Flow Analysis**: Inspects three specific data types—precise coordinate pairs, email addresses, and device identifiers—across URL queries, HAR queryString parameters, JSON request bodies, and form parameters. It does not inspect HTTP headers, response bodies, arbitrary names, encoded or binary bodies, or server-side behavior.
- **Five-State Finding Taxonomy**: Categorizes results into *Potential contradiction*, *Observed disclosure match*, *Disclosure not located*, *Not observed in capture*, and *Insufficient evidence*. Ambiguous statements or incomplete payloads trigger conservative abstention rather than speculative scoring. It does not output compliance scores or legal verdicts.
- **Traceable Evidence Cards & Masked Export**: Presents findings alongside exact policy quotation offsets and network request indices. Users can export findings as structured JSON or Markdown reports that mask raw personal data, credentials, full URL paths, unknown hosts, detailed JSON key paths, and free-text notes while preserving structural offsets and timestamps.

## How we built it
PolicyTrace was built as an entirely client-side web application using vanilla JavaScript ES modules, HTML5, and CSS, accompanied by a Node.js local test and server harness. It requires no backend service, database, external API keys, or runtime language models.

System behavior is verified via automated regression suites: at this writing, 51 Node unit tests and 19 Playwright browser interaction checks pass against synthetic scenarios. A separate integration check records real browser HTTP traffic against a controlled local endpoint using synthetic values, then verifies the resulting HAR. Reports also include SHA-256 input fingerprints.

## Challenges
- **Calibrating Conservative Extraction**: Designing rule-based claim extraction across English and Chinese phrasing without producing noisy false inferences required strict pattern constraints and mandatory user confirmation.
- **Disciplined Abstention**: Many privacy statements are conditional or vague, and observed network traffic often contains incomplete parameter fragments. Ensuring the engine abstains with *Insufficient evidence* rather than generating false positives was essential.
- **Balancing Audit Transparency with Privacy**: Designing the report exporter required stripping sensitive payload values, session credentials, and detailed paths while retaining enough positional metadata (offsets and indices) for reproducible audits.

## Accomplishments
- Created a fully functional, zero-dependency browser application performing deterministic flow-to-policy checks without third-party servers.
- Defined and implemented a nuanced five-state finding model that separates positive matches, contradictions, and insufficient evidence without overstepping into legal conclusions.
- Established a comprehensive suite of synthetic regression tests spanning both logic and user interface interactions.

## What we learned
- Deterministic analysis provides reliable reproducibility, but detecting data types alone does not validate user consent, processing purpose, or third-party recipient obligations. Human oversight remains essential.
- Processing captures locally helps reviewers avoid creating another disclosure while investigating one.

## What is next
Future work may include:
- Expanding detection to additional data types beyond coordinates, email addresses, and device identifiers.
- Developing more expressive policy grammar parsing for complex conditional clauses.
- Conducting independent empirical evaluations on annotated real-world application datasets.
- Adding side-by-side regression comparisons across multiple policy versions over time.
- Mapping and verifying destination endpoints against known third-party entity registries.

## Built with
- JavaScript (ES Modules)
- HTML5
- CSS3
- Node.js
- Playwright

## Credits
- **Author**: GUANGRUI LI (Solo builder, Digital Rights & Policy Tech track, LexHack 2026).
- **Academic Research**: PoliCheck (https://www.usenix.org/conference/usenixsecurity20/presentation/andow) and PoliGraph (https://arxiv.org/abs/2210.06746) for pioneering flow-to-policy consistency research.
- **AI Development Assistance**: Codex assisted with architecture, implementation, code review, and testing. Antigravity CLI was used for drafting submission copy.
- **Production and hosting tools**: Playwright/Chromium for browser verification and screen recording; FFmpeg for video encoding; Windows Speech API with the Microsoft Zira voice for synthesized narration; Sites for static hosting; GitHub for source hosting and CI; Vimeo for the public demonstration video.
- **Evaluation Notice**: Tested and demonstrated using synthetic scenarios (the fictional Cedar Notes test cases). This project is not a study of real-world applications and makes no claims regarding real-world accuracy or measured market impact.
