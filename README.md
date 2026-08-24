# Hate Firewall

A cybersecurity-style, explainable AI moderation operations dashboard. Hate Firewall simulates a social platform event stream while separating legitimate criticism of religions, ideas, governments, laws, and individual conduct from hatred directed at Muslims as people.

> **MVP notice:** This is a product prototype, not a production moderation system. Sampled public-signal counts are operational context, not platform-wide prevalence estimates.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/waizyk/Hate-Firewall)

## 60-second judge walkthrough

1. Open the dashboard and select **Judge Lab** in the sidebar.
2. Load **Legitimate criticism** and click **Analyze post** — the expected result is **Allow**.
3. Load **Group exclusion** — the protected-group target, exclusion cue, mobilization cue, severity, and proportional intervention are shown.
4. Load **Counterspeech** — quotation and explicit condemnation activate the context safeguard.
5. Choose **Copy JSON** to inspect the structured result or **Full investigation** to review evidence, context, policy trace, and reversible interventions.

Judge Lab input is processed in memory, is not persisted by default, and is limited to 1,500 characters and 30 requests per minute per client.

## Features

- Interactive **Judge Lab** where anyone can submit a post and receive an immediate explainable decision
- Live public-source status plus clearly labeled simulated platform telemetry
- Six-part analysis: **target, intent, hate severity, confidence, context, and coordination risk**
- Explicit criticism-versus-hate safeguard with policy explanations
- Clickable incident investigations with evidence spans, conversation context, and policy trace
- Analyst actions: **Allow, Warn, Reduce Reach, Moderator Review, Escalate**
- Interactive coordinated-campaign network graph
- Incident queue, signal-source console, campaign intelligence, and audit trail
- Responsive desktop and mobile interface
- Live, no-key public-feed connectors with safe cached fallbacks

## Local development

```bash
npm install
npm test
npm run dev
```

The regression suite covers neutral identity references, legitimate criticism, group exclusion, hostility, violence, quotation, reporting, counterspeech, and content-level coordination cues.

- Dashboard: http://localhost:5173
- API health: http://localhost:8787/api/health
- Live signals: http://localhost:8787/api/live-signals
- Judge analysis: `POST http://localhost:8787/api/analyze` with JSON `{ "text": "...", "context": "standalone" }`

The Vite development server proxies browser requests from `/api/*` to the local Express API. Judge Lab submissions are analyzed in memory and are not persisted by the MVP.

## Production build

```bash
npm ci
npm run build
NODE_ENV=production PORT=8787 npm start
```

In production, Express serves both the compiled dashboard and same-origin API from one port.

## Deploy to Render

The repository includes a Render Blueprint in [`render.yaml`](./render.yaml).

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint**.
3. Connect this GitHub repository.
4. Review the `hate-firewall` web service and deploy it.

Render will run `npm ci --include=dev && npm run build`, start the application with `npm start`, and monitor `/api/health`. No API keys are required for the MVP connectors.

## How the MVP is structured

```text
Browser dashboard
  ├─ POST /api/analyze ── explainable policy engine ── structured decision
  ├─ GET /api/live-signals ── Google News RSS + Mastodon ── redacted sample
  └─ investigation UI ── in-memory analyst action + audit demonstration
```

The Judge Lab currently uses a deterministic, explainable policy engine rather than claiming an externally validated machine-learning model. It is designed so a model provider can later sit behind the same structured API contract. The coordinated-campaign graph and platform-scale telemetry demonstrate the intended product workflow and are not claims of a live platform integration.

## Live public-signal connectors

The API samples two public, no-key endpoints:

- **Google News RSS** for current news-context metadata
- **Mastodon Public API** for a small public hashtag-timeline sample

The browser only calls the same-origin `/api/live-signals` route. The server hashes handles, strips HTML, URLs and email addresses, truncates snippets, and returns aggregate figures. If a provider is unavailable or rate-limited, the connector is marked `cached` and a deterministic fallback batch keeps the dashboard functional.

## Safety and decision design

- Protected-group targeting is evaluated separately from criticism of doctrine, religion, government, law, or individual conduct.
- Quotation, condemnation, documentation, counterspeech, satire, and conversation context can change a decision.
- Human-review and reversible intervention controls are represented in the UI.
- Raw provider data is not persisted by this MVP.
- Public connectors should only be deployed after checking provider terms, retention requirements, and applicable privacy law.

## Technology

React · Vite · Express · Lucide icons · custom SVG visualization · responsive CSS

## License

[MIT](./LICENSE)
