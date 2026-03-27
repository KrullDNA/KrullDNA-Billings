# Krull D+A Billings

Custom desktop invoicing application for Krull D+A — a solo creative agency based in Sydney, Australia.

## Tech Stack

- **Electron** — Cross-platform desktop app (Mac + Windows)
- **React** — UI rendering
- **Vite** — Fast bundling and HMR
- **Tailwind CSS** — Utility-first styling
- **SQLite** (better-sqlite3) — Local database, no server required
- **Puppeteer** — HTML/CSS to A4 PDF generation
- **Nodemailer** — SMTP email with PDF attachments

## Getting Started

```bash
npm install
npm start
```

In development, Vite runs on `http://localhost:5173`. Start the dev server first:

```bash
npm run dev     # Start Vite dev server
npm start       # Start Electron (in a second terminal)
```

## Project Structure

```
src/
  main/         — Electron main process (IPC, database, PDF, email)
  renderer/     — React UI (components, views)
  assets/       — Logo, icons, fonts
  templates/    — Puppeteer HTML/CSS PDF templates
preload.js      — contextBridge IPC surface
```

## Data Model

Client Groups > Clients > Projects > Line Items

Invoices and Estimates draw line items from Projects. Categories group line items on documents.

## Build Sessions

See `BUILD_STATUS.md` for current progress across the 8 build sessions.
