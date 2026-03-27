# Build Status — Krull D+A Billings

| Session | Description | Status | Notes |
|---------|-------------|--------|-------|
| S1 | Scaffolding + Database | Complete | Electron + React + Vite + Tailwind scaffold, SQLite with all tables and seed data, full IPC surface, three-panel layout shell |
| S2 | Clients + Projects | Complete | Full sidebar with dnd-kit group reordering, context menus, client CRUD with full form, project CRUD, client view with projects/line items panels, account tab, status bar |
| S3 | Line Items + Categories | Complete | Full line item CRUD with modal form (Details/Comments tabs, editable title, category/kind/billable dropdowns, duration, started/completed dates, rate/qty/due, markup/discount/tax, live total calculation), clickable rows with expand arrow, delete support, Categories settings panel with dnd-kit drag reorder, inline add/rename/delete |
| S4 | Invoices + Estimates | Complete | InvoiceModal (template picker, Invoice/Slips/Preview tabs, terms/due calc, retainer, delivery options, totals panel), EstimateModal (same structure adapted), Account tab (two-panel: transaction list with INV/EST/PAY badges + detail panel with rendered document view, PAID IN FULL stamp, category-grouped line items), AddPayment modal (pre-filled balance, method dropdown), PaymentReceipt (monospace receipt style), Send Invoice/Estimate buttons, getInvoices with paid_amount |
| S5 | Visual Document Builder | Ready to Start | |
| S6 | PDF Generation + Email | Not Started | |
| S7 | Settings (Full Preferences) | Not Started | |
| S8 | Dashboard + Polish + Packaging | Not Started | |
