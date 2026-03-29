/**
 * Import BillingsPro data into KrullDNA-Billings
 *
 * Usage:  node scripts/import-billingspro.js <path-to-billingspro.bid>
 *
 * This reads the BillingsPro SQLite database and inserts all clients,
 * projects, categories, invoices, estimates, line items, and payments
 * into the KrullDNA-Billings database.
 */

const path = require('path');
const Database = require('better-sqlite3');

const bpPath = process.argv[2];
if (!bpPath) {
  console.error('Usage: node scripts/import-billingspro.js <path-to-billingspro.bid>');
  process.exit(1);
}

// Determine KrullDNA-Billings DB path
const { app } = require('electron');
// When running standalone we can't use app.getPath, so accept optional second arg or default
let krullDbPath = process.argv[3];
if (!krullDbPath) {
  // Try common macOS path
  const os = require('os');
  const possiblePaths = [
    path.join(os.homedir(), 'Library', 'Application Support', 'Krull D+A Billings', 'krull-billings.db'),
    path.join(os.homedir(), '.config', 'Krull D+A Billings', 'krull-billings.db'),
  ];
  for (const p of possiblePaths) {
    const fs = require('fs');
    if (fs.existsSync(p)) { krullDbPath = p; break; }
  }
}

// Actually, let's just do this as an IPC-callable import that runs inside the Electron main process
// So we export a function instead

function importBillingsPro(bpDbPath, krullDb) {
  const bp = new Database(bpDbPath, { readonly: true });

  // Helper: convert BillingsPro unix timestamp to ISO date string
  function tsToDate(ts) {
    if (!ts) return null;
    const d = new Date(ts * 1000);
    return d.toISOString().slice(0, 10);
  }

  function tsToDatetime(ts) {
    if (!ts) return null;
    return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19);
  }

  // ── 1. Import Client Groups ──
  console.log('Importing client groups...');
  const bpGroups = bp.prepare('SELECT * FROM ClientCategory ORDER BY _rowid').all();
  const groupMap = {}; // bp _rowid -> krull id

  // Get existing groups
  const existingGroups = krullDb.prepare('SELECT id, name FROM client_groups').all();
  const existingGroupNames = {};
  for (const g of existingGroups) existingGroupNames[g.name.toUpperCase()] = g.id;

  for (const g of bpGroups) {
    const name = g.name || 'General';
    if (existingGroupNames[name.toUpperCase()]) {
      groupMap[g._rowid] = existingGroupNames[name.toUpperCase()];
    } else {
      const result = krullDb.prepare('INSERT INTO client_groups (name, sort_order) VALUES (?, ?)').run(name, g.orderIndex || 0);
      groupMap[g._rowid] = result.lastInsertRowid;
      existingGroupNames[name.toUpperCase()] = result.lastInsertRowid;
    }
  }
  console.log(`  ${bpGroups.length} groups processed`);

  // ── 2. Import Categories ──
  console.log('Importing categories...');
  const bpCategories = bp.prepare('SELECT _rowid, name FROM Category ORDER BY _rowid').all();
  const categoryMap = {}; // bp _rowid -> krull id

  for (const cat of bpCategories) {
    const name = (cat.name || '').trim();
    if (!name) continue;
    const existing = krullDb.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) {
      categoryMap[cat._rowid] = existing.id;
    } else {
      const result = krullDb.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
      categoryMap[cat._rowid] = result.lastInsertRowid;
    }
  }
  console.log(`  ${bpCategories.length} categories processed`);

  // ── 3. Import Clients ──
  console.log('Importing clients...');
  const bpClients = bp.prepare('SELECT * FROM Client ORDER BY _rowid').all();
  const clientMap = {}; // bp _rowid -> krull id

  for (const c of bpClients) {
    const groupId = groupMap[c.clientCategoryID] || null;
    const result = krullDb.prepare(`
      INSERT INTO clients (group_id, first_name, last_name, company, is_company, email,
        address_street, address_city, address_state, address_postcode, address_country,
        client_number, tax_id, hourly_rate, mileage_rate, currency, retainer_balance, archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      groupId, c.firstName || null, c.lastName || null, c.company || null,
      c.isCompany ? 1 : 0, c.email || null,
      c.addressStreet || null, c.addressCity || null, c.addressState || null,
      c.addressZIP || null, c.addressCountry || null,
      c.clientNumber || null, c.taxNumber || null,
      c.hourlyRate || 0, c.mileageRate || 0, 'AUD',
      c.retainersBalanceCached || 0,
      tsToDatetime(c.createDate)
    );
    clientMap[c._rowid] = result.lastInsertRowid;
  }
  console.log(`  ${bpClients.length} clients imported`);

  // ── 4. Import Projects ──
  console.log('Importing projects...');
  const bpProjects = bp.prepare('SELECT * FROM Project ORDER BY _rowid').all();
  const projectMap = {}; // bp _rowid -> krull id

  for (const p of bpProjects) {
    const clientId = clientMap[p.clientID];
    if (!clientId) continue;
    const status = p.stateID === 2 ? 'completed' : 'active';
    const result = krullDb.prepare(`
      INSERT INTO projects (client_id, name, status, due_date, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      clientId, p.name || 'Untitled Project', status,
      tsToDate(p.dueDate), p.objective || null,
      tsToDatetime(p.createDate)
    );
    projectMap[p._rowid] = result.lastInsertRowid;
  }
  console.log(`  ${bpProjects.length} projects imported`);

  // ── 5. Import Invoices + their line items (TimeSlips) ──
  console.log('Importing invoices...');
  const bpInvoices = bp.prepare(`
    SELECT i.*, p.clientID FROM Invoice i
    LEFT JOIN Project p ON i.projectID = p._rowid
    ORDER BY i._rowid
  `).all();

  const invoiceMap = {}; // bp _rowid -> krull id
  let invoiceCount = 0;
  let invoiceLineCount = 0;

  for (const inv of bpInvoices) {
    const clientId = clientMap[inv.clientID];
    if (!clientId) continue;
    const projectId = projectMap[inv.projectID] || null;

    // Status mapping: BillingsPro state 102 = paid (all seem to be 102)
    const status = inv.state === 102 ? 'paid' : 'draft';

    const invoiceDate = tsToDate(inv.invoiceDate);
    const dueDate = tsToDate(inv.dueDate);
    const total = inv.totalCached || 0;

    // Calculate tax from line items
    const bpSlips = bp.prepare(`
      SELECT ts.*, c.name as categoryName FROM TimeSlip ts
      LEFT JOIN Category c ON ts.categoryID = c._rowid
      WHERE ts.invoiceID = ? ORDER BY ts._rowid
    `).all(inv._rowid);

    let subtotal = 0;
    let taxTotal = 0;
    for (const s of bpSlips) {
      const slipTotal = s.totalCached || s.total || 0;
      const slipRate = s.rate || 0;
      const slipQty = s.units > 0 ? s.units : 1;
      const slipSubtotal = slipRate * slipQty;
      const slipTax = slipTotal - slipSubtotal;
      subtotal += slipSubtotal;
      if (slipTax > 0) taxTotal += slipTax;
    }

    // If no slips, use the cached total
    if (bpSlips.length === 0) subtotal = total;

    const result = krullDb.prepare(`
      INSERT INTO invoices (client_id, project_id, invoice_number, status, currency,
        invoice_date, due_date, subtotal, tax_total, total, created_at)
      VALUES (?, ?, ?, ?, 'AUD', ?, ?, ?, ?, ?, ?)
    `).run(
      clientId, projectId, inv.invoiceNumber, status, invoiceDate, dueDate,
      subtotal, taxTotal, total, tsToDatetime(inv.createDate)
    );

    const invoiceId = result.lastInsertRowid;
    invoiceMap[inv._rowid] = invoiceId;
    invoiceCount++;

    // Insert invoice line items
    for (let idx = 0; idx < bpSlips.length; idx++) {
      const s = bpSlips[idx];
      const slipTotal = s.totalCached || s.total || 0;
      const slipRate = s.rate || 0;
      const slipQty = s.units > 0 ? s.units : 1;
      const slipSubtotal = slipRate * slipQty;
      const slipTaxAmt = slipTotal - slipSubtotal;
      const taxName = s.tax1Name || (slipTaxAmt > 0 ? 'GST' : null);
      const taxRate = s.tax1 || (slipTaxAmt > 0 ? 10 : 0);

      krullDb.prepare(`
        INSERT INTO invoice_line_items (invoice_id, category_name, name, kind, quantity, rate,
          tax_name, tax_rate, subtotal, tax_amount, total, sort_order)
        VALUES (?, ?, ?, 'fixed', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId, s.categoryName || null, s.name || 'Line Item',
        slipQty, slipRate, taxName, taxRate,
        slipSubtotal, slipTaxAmt > 0 ? slipTaxAmt : 0, slipTotal, idx
      );
      invoiceLineCount++;
    }
  }
  console.log(`  ${invoiceCount} invoices, ${invoiceLineCount} line items imported`);

  // ── 6. Import Estimates + their line items (EstimateSlips) ──
  console.log('Importing estimates...');
  const bpEstimates = bp.prepare(`
    SELECT e.*, p.clientID FROM Estimate e
    LEFT JOIN Project p ON e.projectID = p._rowid
    ORDER BY e._rowid
  `).all();

  let estimateCount = 0;
  let estimateLineCount = 0;

  for (const est of bpEstimates) {
    const clientId = clientMap[est.clientID];
    if (!clientId) continue;
    const projectId = projectMap[est.projectID] || null;

    const estimateDate = tsToDate(est.createDate);
    const expiryDate = tsToDate(est.dueDate);

    // Get estimate slips
    const bpEstSlips = bp.prepare(`
      SELECT es.*, c.name as categoryName FROM EstimateSlip es
      LEFT JOIN Category c ON es.categoryID = c._rowid
      WHERE es.estimateID = ? ORDER BY es._rowid
    `).all(est._rowid);

    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;

    for (const s of bpEstSlips) {
      const slipTotal = s.total || 0;
      const slipRate = s.rate || 0;
      const slipQty = s.units > 0 ? s.units : 1;
      const slipSubtotal = slipRate * slipQty;
      const slipTax = slipTotal - slipSubtotal;
      subtotal += slipSubtotal;
      if (slipTax > 0) taxTotal += slipTax;
      total += slipTotal;
    }

    if (bpEstSlips.length === 0) {
      subtotal = est.subTotal || 0;
      total = subtotal;
    }

    const status = est.state === 102 ? 'approved' : 'draft';

    const result = krullDb.prepare(`
      INSERT INTO estimates (client_id, project_id, estimate_number, status, currency,
        estimate_date, expiry_date, subtotal, tax_total, total, created_at)
      VALUES (?, ?, ?, ?, 'AUD', ?, ?, ?, ?, ?, ?)
    `).run(
      clientId, projectId, est.estimateNumber, status, estimateDate, expiryDate,
      subtotal, taxTotal, total, tsToDatetime(est.createDate)
    );

    const estimateId = result.lastInsertRowid;
    estimateCount++;

    for (let idx = 0; idx < bpEstSlips.length; idx++) {
      const s = bpEstSlips[idx];
      const slipTotal = s.total || 0;
      const slipRate = s.rate || 0;
      const slipQty = s.units > 0 ? s.units : 1;
      const slipSubtotal = slipRate * slipQty;
      const slipTaxAmt = slipTotal - slipSubtotal;
      const taxName = s.tax1Name || (slipTaxAmt > 0 ? 'GST' : null);
      const taxRate = s.tax1 || (slipTaxAmt > 0 ? 10 : 0);

      krullDb.prepare(`
        INSERT INTO estimate_line_items (estimate_id, category_name, name, quantity, rate,
          tax_name, tax_rate, subtotal, tax_amount, total, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        estimateId, s.categoryName || null, s.name || 'Line Item',
        slipQty, slipRate, taxName, taxRate,
        slipSubtotal, slipTaxAmt > 0 ? slipTaxAmt : 0, slipTotal, idx
      );
      estimateLineCount++;
    }
  }
  console.log(`  ${estimateCount} estimates, ${estimateLineCount} line items imported`);

  // ── 7. Import Payments ──
  console.log('Importing payments...');
  const bpPayments = bp.prepare(`
    SELECT p.*, pie.invoiceID, pie.amountApplied, pmt.name as methodName
    FROM Payment p
    LEFT JOIN PaymentInvoiceEntry pie ON pie.paymentID = p._rowid AND pie.amountApplied > 0
    LEFT JOIN PaymentMethodType pmt ON p.methodID = pmt._rowid
    ORDER BY p._rowid
  `).all();

  let paymentCount = 0;
  const seenPayments = new Set();

  for (const pay of bpPayments) {
    const clientId = clientMap[pay.clientID];
    if (!clientId) continue;

    const invoiceId = invoiceMap[pay.invoiceID] || null;
    const amount = pay.amountApplied || pay.total || 0;
    if (amount <= 0) continue;

    // Deduplicate (PaymentInvoiceEntry can create multiple rows per payment)
    const key = `${pay._rowid}-${pay.invoiceID}`;
    if (seenPayments.has(key)) continue;
    seenPayments.add(key);

    krullDb.prepare(`
      INSERT INTO payments (client_id, invoice_id, amount, method, payment_date, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientId, invoiceId, amount,
      pay.methodName || null,
      tsToDate(pay.createDate),
      pay.comment || null,
      tsToDatetime(pay.createDate)
    );
    paymentCount++;
  }
  console.log(`  ${paymentCount} payments imported`);

  bp.close();
  console.log('\nImport complete!');

  return {
    clients: Object.keys(clientMap).length,
    projects: Object.keys(projectMap).length,
    invoices: invoiceCount,
    invoiceLines: invoiceLineCount,
    estimates: estimateCount,
    estimateLines: estimateLineCount,
    payments: paymentCount,
    categories: Object.keys(categoryMap).length,
    groups: Object.keys(groupMap).length,
  };
}

module.exports = { importBillingsPro };
