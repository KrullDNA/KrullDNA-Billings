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
- **dnd-kit** — Drag and drop (line item reordering, visual builder, settings lists)

## Getting Started

```bash
npm install
npm start
```

In development, run the Vite dev server and Electron separately:

```bash
npm run dev:renderer   # Start Vite dev server (terminal 1)
npm start              # Build + start Electron (terminal 2)
```

## Build for Distribution

```bash
npm run build:mac      # Mac .dmg (universal: Intel + Apple Silicon)
npm run build:win      # Windows .exe (NSIS installer)
```

Output goes to `/dist`.

## Project Structure

```
src/
  main/           — Electron main process
    main.js         IPC handlers, window management
    db.js           SQLite database (all tables, queries, seed data)
    pdf.js          Puppeteer HTML rendering + PDF generation
    email.js        Nodemailer SMTP + Mac Mail.app fallback
    config.js       Window state persistence
  renderer/       — React UI
    components/
      builder/      Visual document builder (drag-and-drop blocks)
      clients/      Client list, form, detail view
      dashboard/    Dashboard summary + Reports
      estimates/    Estimate modal + Approvals
      invoices/     Invoice modal
      lineitems/    Line item form, All Slips, Unfiled Slips
      payments/     Add Payment, Payment Receipt
      projects/     Project form
      settings/     Full preferences panel (8 tabs)
      shared/       Sidebar, Toolbar, Modal, Toast
  assets/         — Logo, icons, fonts
  templates/      — Puppeteer HTML/CSS PDF templates
preload.js        — contextBridge IPC surface (60+ methods)
```

## Data Model

```
Client Groups > Clients > Projects > Line Items
```

Invoices and Estimates snapshot line items from Projects.
Categories group line items on documents with bold header rows.

## Key Features

- **Client Management** — Groups, CRUD, archive, multi-address
- **Project Tracking** — Per-client projects with time/total tracking
- **Line Items** — Full CRUD with category assignment, live total calculation
- **Invoicing** — Template picker, auto-numbering, terms/due date, retainer deduction
- **Estimates** — Same flow adapted for pre-work approval
- **Visual Document Builder** — 9 drag-and-drop block types, A4 canvas, properties panel
- **PDF Generation** — Puppeteer renders template blocks to A4 PDF with category headers
- **Email** — SMTP send with PDF attachment, placeholder resolution
- **Payments** — Record payments, auto-mark paid, receipt generation
- **Dashboard** — Summary cards, recent activity, overdue invoices
- **Reports** — Income by client, tax collected, outstanding invoices (CSV export)
- **Settings** — 8 tabs: General, Identity, Currencies, Taxes, Templates, Numbering, Labels, Email

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl+N | New (context-sensitive) |
| Escape | Close modal |

## Version

1.0.0 — March 2026
