# Multi-source lead intake and deduplication

**Background.** A real estate team receives the same prospect from a website and a portal notification. A second submission should update the existing record and keep an assigned owner.

**What runs.** Import [`workflow.json`](workflow.json) into n8n, start [`app.mjs`](app.mjs) with Node.js 24, and activate the workflow. The n8n webhook validates an event and posts it to the local HTTP service. The service persists leads in SQLite, normalizes email and phone, assigns an owner, and tracks source count. Its data is written to `runtime/leads.sqlite`.

**Tools and build effort.** n8n Webhook/Code/HTTP Request, Node.js built-in HTTP server and SQLite. Built and tested in one working session (under one day). This is a self-directed demonstration project using synthetic contacts.

**Verified result.** [`evidence.json`](evidence.json) records two real POST requests through a published n8n webhook. The first created a lead. The second, from a different source, updated the same record; `sourceCount` became 2. To repeat the check, set `N8N_WEBHOOK_URL` to the production webhook URL shown in n8n and run `node verify.mjs`.

**Local setup.** Start `node app.mjs` in this directory. The service listens on `127.0.0.1:5711`. Import the workflow in a local n8n instance on the same machine and activate it. Send JSON to `POST /webhook/portfolio-lead-intake`; the body needs `source` and either `email` or `phone`. The exact webhook path may gain an n8n prefix after import; copy the production URL shown in n8n.

**Scope.** No commercial CRM, portal API, or external messaging service is connected. The SQLite database is a local substitute for the CRM, not proof of CRM integration. This project has not been delivered to a client.
