const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

let db;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'krull-billings.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  seedDefaults();

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.');
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER REFERENCES client_groups(id),
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      is_company INTEGER DEFAULT 0,
      email TEXT,
      phone TEXT,
      address_street TEXT,
      address_city TEXT,
      address_state TEXT,
      address_postcode TEXT,
      address_country TEXT DEFAULT 'Australia',
      client_number TEXT,
      tax_id TEXT,
      hourly_rate REAL DEFAULT 0,
      mileage_rate REAL DEFAULT 0,
      currency TEXT DEFAULT 'AUD',
      extra_field_1 TEXT,
      extra_field_2 TEXT,
      extra_field_3 TEXT,
      notes TEXT,
      retainer_balance REAL DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      due_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS taxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      kind TEXT DEFAULT 'fixed',
      billable INTEGER DEFAULT 1,
      duration_seconds INTEGER DEFAULT 0,
      rate REAL DEFAULT 0,
      quantity REAL DEFAULT 1,
      markup_pct REAL DEFAULT 0,
      discount_pct REAL DEFAULT 0,
      tax_id INTEGER REFERENCES taxes(id),
      subtotal REAL DEFAULT 0,
      markup_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'unbilled',
      notes TEXT,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      project_id INTEGER REFERENCES projects(id),
      invoice_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      currency TEXT DEFAULT 'AUD',
      invoice_date TEXT,
      due_date TEXT,
      paid_date TEXT,
      terms TEXT,
      subtotal REAL DEFAULT 0,
      markup_total REAL DEFAULT 0,
      discount_total REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      retainer_applied REAL DEFAULT 0,
      total REAL DEFAULT 0,
      template_id INTEGER REFERENCES document_templates(id),
      layout_snapshot TEXT,
      notes TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES invoices(id),
      line_item_id INTEGER REFERENCES line_items(id),
      category_name TEXT,
      name TEXT NOT NULL,
      kind TEXT,
      quantity REAL DEFAULT 1,
      rate REAL DEFAULT 0,
      markup_pct REAL DEFAULT 0,
      discount_pct REAL DEFAULT 0,
      tax_name TEXT,
      tax_rate REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      project_id INTEGER REFERENCES projects(id),
      estimate_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      currency TEXT DEFAULT 'AUD',
      estimate_date TEXT,
      expiry_date TEXT,
      subtotal REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      total REAL DEFAULT 0,
      template_id INTEGER REFERENCES document_templates(id),
      layout_snapshot TEXT,
      notes TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS estimate_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_id INTEGER REFERENCES estimates(id),
      line_item_id INTEGER REFERENCES line_items(id),
      category_name TEXT,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      rate REAL DEFAULT 0,
      tax_name TEXT,
      tax_rate REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      invoice_id INTEGER REFERENCES invoices(id),
      amount REAL NOT NULL,
      method TEXT,
      payment_date TEXT DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      blocks_json TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedDefaults() {
  const groupCount = db.prepare('SELECT COUNT(*) as c FROM client_groups').get().c;
  if (groupCount === 0) {
    const insertGroup = db.prepare('INSERT INTO client_groups (name, sort_order) VALUES (?, ?)');
    const groups = ['General', 'Working Clients', 'Completed Clients', 'Pitch Clients', 'Bad Debts'];
    groups.forEach((name, i) => insertGroup.run(name, i));
  }

  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    const cats = [
      'ADMINISTRATION', 'ART DIRECTION', 'AUDIO DESIGN', 'BANNERS',
      'BROCHURES', 'COMMUNICATIONS', 'DESIGN', 'DEVELOPMENT',
    ];
    cats.forEach((name, i) => insertCat.run(name, i));
  }

  const taxCount = db.prepare('SELECT COUNT(*) as c FROM taxes').get().c;
  if (taxCount === 0) {
    db.prepare('INSERT INTO taxes (name, rate, is_default) VALUES (?, ?, ?)').run('GST 10%', 0.10, 1);
    db.prepare('INSERT INTO taxes (name, rate, is_default) VALUES (?, ?, ?)').run('No Tax', 0, 0);
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const defaults = {
      business_name: 'Krull D+A',
      default_currency: 'AUD',
      default_payment_terms: '14 Days',
      invoice_prefix: 'INV-',
      invoice_next_number: '1001',
      estimate_prefix: 'EST-',
      estimate_next_number: '1001',
      brand_colour: '#4263eb',
    };
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value);
    }
  }

  // Seed default payment methods
  const hasMethods = db.prepare("SELECT value FROM settings WHERE key = 'payment_methods'").get();
  if (!hasMethods) {
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
      'payment_methods',
      JSON.stringify(['Electronic', 'Cash', 'Cheque', 'Credit Card', 'Bank Transfer'])
    );
  }

  // Seed default document templates
  const templateCount = db.prepare('SELECT COUNT(*) as c FROM document_templates').get().c;
  if (templateCount === 0) {
    const defaultInvoiceBlocks = JSON.stringify([
      { id: 'b1', type: 'header_block', props: { showLogo: true, paddingTop: 0, paddingBottom: 20 } },
      { id: 'b2', type: 'doc_title_block', props: { titleLabel: 'DESCRIPTION', paddingTop: 8, paddingBottom: 12 } },
      { id: 'b3', type: 'line_items_block', props: { fontSize: 11, paddingTop: 0, paddingBottom: 0 } },
      { id: 'b4', type: 'spacer_block', props: { height: 60, paddingTop: 0, paddingBottom: 0 } },
      { id: 'b5', type: 'totals_block', props: { alignment: 'right', showSubtotal: true, showMarkup: true, showDiscount: true, showTax: true, showRetainer: true, highlightTotal: true, paddingTop: 0, paddingBottom: 16 } },
      { id: 'b6', type: 'footer_block', props: { defaultTerms: 'COD', paddingTop: 16, paddingBottom: 0 } },
    ]);

    const defaultEstimateBlocks = JSON.stringify([
      { id: 'b1', type: 'header_block', props: { showLogo: true, paddingTop: 0, paddingBottom: 20 } },
      { id: 'b2', type: 'doc_title_block', props: { titleLabel: 'DESCRIPTION', paddingTop: 8, paddingBottom: 12 } },
      { id: 'b3', type: 'line_items_block', props: { fontSize: 11, paddingTop: 0, paddingBottom: 0 } },
      { id: 'b4', type: 'spacer_block', props: { height: 60, paddingTop: 0, paddingBottom: 0 } },
      { id: 'b5', type: 'totals_block', props: { alignment: 'right', showSubtotal: true, showMarkup: false, showDiscount: false, showTax: true, showRetainer: false, highlightTotal: true, paddingTop: 0, paddingBottom: 16 } },
      { id: 'b6', type: 'footer_block', props: { defaultTerms: '30 Days', paddingTop: 16, paddingBottom: 0 } },
    ]);

    db.prepare('INSERT INTO document_templates (name, type, blocks_json, is_default) VALUES (?, ?, ?, ?)').run('KD Invoice 7 Days', 'invoice', defaultInvoiceBlocks, 1);
    db.prepare('INSERT INTO document_templates (name, type, blocks_json, is_default) VALUES (?, ?, ?, ?)').run('KD Estimate', 'estimate', defaultEstimateBlocks, 1);
  }
}

// ── Client Groups ──

function getClientGroups() {
  return db.prepare('SELECT * FROM client_groups ORDER BY sort_order').all();
}

function saveClientGroup(data) {
  if (data.id) {
    db.prepare('UPDATE client_groups SET name = ? WHERE id = ?').run(data.name, data.id);
    return data.id;
  }
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as n FROM client_groups').get().n;
  return db.prepare('INSERT INTO client_groups (name, sort_order) VALUES (?, ?)').run(data.name, maxOrder).lastInsertRowid;
}

function deleteClientGroup(id) {
  const general = db.prepare("SELECT id FROM client_groups WHERE name = 'General'").get();
  if (general) {
    db.prepare('UPDATE clients SET group_id = ? WHERE group_id = ?').run(general.id, id);
  }
  db.prepare('DELETE FROM client_groups WHERE id = ?').run(id);
}

function reorderClientGroups(orderedIds) {
  const stmt = db.prepare('UPDATE client_groups SET sort_order = ? WHERE id = ?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, i) => stmt.run(i, id));
  });
  tx(orderedIds);
}

// ── Clients ──

function getClients(groupId) {
  if (groupId) {
    return db.prepare('SELECT * FROM clients WHERE group_id = ? AND archived = 0 ORDER BY company, last_name, first_name').all(groupId);
  }
  return db.prepare('SELECT * FROM clients WHERE archived = 0 ORDER BY company, last_name, first_name').all();
}

function getClient(id) {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (client) {
    client.projects = db.prepare("SELECT * FROM projects WHERE client_id = ? AND status != 'archived' ORDER BY created_at DESC").all(id);
  }
  return client;
}

function createClient(data) {
  const cols = Object.keys(data);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO clients (${cols.join(', ')}) VALUES (${placeholders})`;
  return db.prepare(sql).run(...Object.values(data)).lastInsertRowid;
}

function updateClient(id, data) {
  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE clients SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(data), id);
}

function archiveClient(id) {
  db.prepare('UPDATE clients SET archived = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
}

function getClientSummary(clientId) {
  const overdue = db.prepare("SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE client_id = ? AND status = 'overdue'").get(clientId).t;
  const totalBilled = db.prepare("SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE client_id = ? AND status != 'cancelled'").get(clientId).t;
  const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE client_id = ?').get(clientId).t;
  return { overdue, totalBilled, totalPaid, balance: totalBilled - totalPaid };
}

function moveClientToGroup(clientId, groupId) {
  db.prepare('UPDATE clients SET group_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(groupId, clientId);
}

// ── Projects ──

function getProjects(clientId) {
  return db.prepare(`
    SELECT p.*,
      COALESCE(SUM(CASE WHEN li.status = 'unbilled' THEN li.total ELSE 0 END), 0) as unbilled_total,
      COALESCE(SUM(li.total), 0) as line_items_total,
      COALESCE(SUM(li.duration_seconds), 0) as total_duration
    FROM projects p
    LEFT JOIN line_items li ON li.project_id = p.id
    WHERE p.client_id = ? AND p.status != 'archived'
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(clientId);
}

function getProject(id) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (project) {
    project.lineItems = db.prepare('SELECT li.*, c.name as category_name, t.name as tax_name, t.rate as tax_rate FROM line_items li LEFT JOIN categories c ON li.category_id = c.id LEFT JOIN taxes t ON li.tax_id = t.id WHERE li.project_id = ? ORDER BY li.created_at').all(id);
  }
  return project;
}

function createProject(data) {
  return db.prepare('INSERT INTO projects (client_id, name, due_date, notes) VALUES (?, ?, ?, ?)').run(data.client_id, data.name, data.due_date || null, data.notes || null).lastInsertRowid;
}

function updateProject(id, data) {
  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(data), id);
}

function archiveProject(id) {
  db.prepare("UPDATE projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(id);
}

// ── Line Items ──

function getLineItems(projectId) {
  return db.prepare('SELECT li.*, c.name as category_name, t.name as tax_name, t.rate as tax_rate FROM line_items li LEFT JOIN categories c ON li.category_id = c.id LEFT JOIN taxes t ON li.tax_id = t.id WHERE li.project_id = ? ORDER BY li.created_at').all(projectId);
}

function getUnbilledLineItems(projectId) {
  return db.prepare("SELECT li.*, c.name as category_name, t.name as tax_name, t.rate as tax_rate FROM line_items li LEFT JOIN categories c ON li.category_id = c.id LEFT JOIN taxes t ON li.tax_id = t.id WHERE li.project_id = ? AND li.status = 'unbilled' ORDER BY li.created_at").all(projectId);
}

function createLineItem(data) {
  const cols = Object.keys(data);
  const placeholders = cols.map(() => '?').join(', ');
  return db.prepare(`INSERT INTO line_items (${cols.join(', ')}) VALUES (${placeholders})`).run(...Object.values(data)).lastInsertRowid;
}

function updateLineItem(id, data) {
  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE line_items SET ${sets} WHERE id = ?`).run(...Object.values(data), id);
}

function deleteLineItem(id) {
  db.prepare('DELETE FROM line_items WHERE id = ?').run(id);
}

function markLineItemsInvoiced(ids) {
  const placeholders = ids.map(() => '?').join(', ');
  db.prepare(`UPDATE line_items SET status = 'invoiced' WHERE id IN (${placeholders})`).run(...ids);
}

// ── Categories ──

function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
}

function saveCategory(data) {
  if (data.id) {
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(data.name, data.id);
    return data.id;
  }
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as n FROM categories').get().n;
  return db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(data.name, maxOrder).lastInsertRowid;
}

function deleteCategory(id) {
  const used = db.prepare('SELECT COUNT(*) as c FROM line_items WHERE category_id = ?').get(id).c;
  if (used > 0) throw new Error('Category is in use by line items and cannot be deleted.');
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

function reorderCategories(orderedIds) {
  const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, i) => stmt.run(i, id));
  });
  tx(orderedIds);
}

// ── Taxes ──

function getTaxes() {
  return db.prepare('SELECT * FROM taxes ORDER BY id').all();
}

function saveTax(data) {
  if (data.id) {
    db.prepare('UPDATE taxes SET name = ?, rate = ? WHERE id = ?').run(data.name, data.rate, data.id);
    return data.id;
  }
  return db.prepare('INSERT INTO taxes (name, rate, is_default) VALUES (?, ?, ?)').run(data.name, data.rate, data.is_default || 0).lastInsertRowid;
}

function deleteTax(id) {
  db.prepare('DELETE FROM taxes WHERE id = ?').run(id);
}

function setDefaultTax(id) {
  db.prepare('UPDATE taxes SET is_default = 0').run();
  db.prepare('UPDATE taxes SET is_default = 1 WHERE id = ?').run(id);
}

// ── Invoices ──

function getInvoices(clientId) {
  const query = `
    SELECT i.*, COALESCE(SUM(p.amount), 0) as paid_amount
    FROM invoices i
    LEFT JOIN payments p ON p.invoice_id = i.id
    ${clientId ? 'WHERE i.client_id = ?' : ''}
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;
  return clientId ? db.prepare(query).all(clientId) : db.prepare(query).all();
}

function getInvoice(id) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (invoice) {
    invoice.lineItems = db.prepare('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order').all(id);
  }
  return invoice;
}

function createInvoice(data, lineItemIds) {
  const nextNum = getSettingValue('invoice_next_number') || '1001';
  const prefix = getSettingValue('invoice_prefix') || '';
  const invoiceNumber = `${prefix}${nextNum}`;

  const result = db.prepare(`
    INSERT INTO invoices (client_id, project_id, invoice_number, currency, invoice_date, due_date, terms, template_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.client_id, data.project_id, invoiceNumber, data.currency || 'AUD',
    data.invoice_date, data.due_date, data.terms, data.template_id || null, data.notes || null
  );

  const invoiceId = result.lastInsertRowid;

  if (lineItemIds && lineItemIds.length > 0) {
    const items = lineItemIds.map((liId, i) => {
      const li = db.prepare('SELECT li.*, c.name as category_name, t.name as tax_name, t.rate as tax_rate FROM line_items li LEFT JOIN categories c ON li.category_id = c.id LEFT JOIN taxes t ON li.tax_id = t.id WHERE li.id = ?').get(liId);
      return { ...li, sort_order: i };
    }).filter(Boolean);

    const insertILI = db.prepare(`
      INSERT INTO invoice_line_items (invoice_id, line_item_id, category_name, name, kind, quantity, rate, markup_pct, discount_pct, tax_name, tax_rate, subtotal, tax_amount, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let subtotal = 0, taxTotal = 0, markupTotal = 0, discountTotal = 0;
    for (const li of items) {
      insertILI.run(invoiceId, li.id, li.category_name, li.name, li.kind, li.quantity, li.rate, li.markup_pct, li.discount_pct, li.tax_name, li.tax_rate || 0, li.subtotal, li.tax_amount, li.total, li.sort_order);
      subtotal += li.subtotal;
      taxTotal += li.tax_amount;
      markupTotal += li.markup_amount || 0;
      discountTotal += li.discount_amount || 0;
    }

    const total = subtotal + markupTotal - discountTotal + taxTotal;
    db.prepare('UPDATE invoices SET subtotal = ?, markup_total = ?, discount_total = ?, tax_total = ?, total = ? WHERE id = ?').run(subtotal, markupTotal, discountTotal, taxTotal, total, invoiceId);

    markLineItemsInvoiced(lineItemIds);
  }

  saveSetting('invoice_next_number', String(parseInt(nextNum) + 1));
  return invoiceId;
}

function updateInvoice(id, data) {
  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE invoices SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(data), id);
}

function updateInvoiceStatus(id, status) {
  const updates = { status };
  if (status === 'paid') updates.paid_date = new Date().toISOString().slice(0, 10);
  if (status === 'sent') updates.sent_at = new Date().toISOString();
  const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE invoices SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(updates), id);
}

function deleteInvoice(id) {
  db.prepare('DELETE FROM invoice_line_items WHERE invoice_id = ?').run(id);
  db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

function deleteInvoiceAndRestore(id) {
  const lineItemIds = db.prepare('SELECT line_item_id FROM invoice_line_items WHERE invoice_id = ? AND line_item_id IS NOT NULL').all(id).map(r => r.line_item_id);
  db.prepare('DELETE FROM invoice_line_items WHERE invoice_id = ?').run(id);
  db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
  if (lineItemIds.length > 0) {
    const placeholders = lineItemIds.map(() => '?').join(',');
    db.prepare(`UPDATE line_items SET status = 'unbilled' WHERE id IN (${placeholders})`).run(...lineItemIds);
  }
}

function convertEstimateToInvoice(estimateId) {
  const est = getEstimate(estimateId);
  if (!est) throw new Error('Estimate not found');

  const lineItemIds = est.lineItems.map((li) => li.line_item_id).filter(Boolean);
  const invoiceId = createInvoice({
    client_id: est.client_id,
    project_id: est.project_id,
    currency: est.currency,
    invoice_date: new Date().toISOString().slice(0, 10),
    template_id: est.template_id,
    notes: est.notes,
  }, lineItemIds);

  updateEstimateStatus(estimateId, 'approved');
  return invoiceId;
}

// ── Estimates ──

function getEstimates(clientId) {
  if (clientId) {
    return db.prepare('SELECT * FROM estimates WHERE client_id = ? ORDER BY created_at DESC').all(clientId);
  }
  return db.prepare('SELECT * FROM estimates ORDER BY created_at DESC').all();
}

function getEstimate(id) {
  const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
  if (estimate) {
    estimate.lineItems = db.prepare('SELECT * FROM estimate_line_items WHERE estimate_id = ? ORDER BY sort_order').all(id);
  }
  return estimate;
}

function createEstimate(data, lineItemIds) {
  const nextNum = getSettingValue('estimate_next_number') || '1001';
  const prefix = getSettingValue('estimate_prefix') || '';
  const estimateNumber = `${prefix}${nextNum}`;

  const result = db.prepare(`
    INSERT INTO estimates (client_id, project_id, estimate_number, currency, estimate_date, expiry_date, template_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.client_id, data.project_id, estimateNumber, data.currency || 'AUD',
    data.estimate_date, data.expiry_date || null, data.template_id || null, data.notes || null
  );

  const estimateId = result.lastInsertRowid;

  if (lineItemIds && lineItemIds.length > 0) {
    const items = lineItemIds.map((liId, i) => {
      const li = db.prepare('SELECT li.*, c.name as category_name, t.name as tax_name, t.rate as tax_rate FROM line_items li LEFT JOIN categories c ON li.category_id = c.id LEFT JOIN taxes t ON li.tax_id = t.id WHERE li.id = ?').get(liId);
      return { ...li, sort_order: i };
    }).filter(Boolean);

    const insertELI = db.prepare(`
      INSERT INTO estimate_line_items (estimate_id, line_item_id, category_name, name, quantity, rate, tax_name, tax_rate, subtotal, tax_amount, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let subtotal = 0, taxTotal = 0;
    for (const li of items) {
      insertELI.run(estimateId, li.id, li.category_name, li.name, li.quantity, li.rate, li.tax_name, li.tax_rate || 0, li.subtotal, li.tax_amount, li.total, li.sort_order);
      subtotal += li.subtotal;
      taxTotal += li.tax_amount;
    }

    db.prepare('UPDATE estimates SET subtotal = ?, tax_total = ?, total = ? WHERE id = ?').run(subtotal, taxTotal, subtotal + taxTotal, estimateId);
  }

  saveSetting('estimate_next_number', String(parseInt(nextNum) + 1));
  return estimateId;
}

function updateEstimate(id, data) {
  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE estimates SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(data), id);
}

function updateEstimateStatus(id, status) {
  const updates = { status };
  if (status === 'sent') updates.sent_at = new Date().toISOString();
  const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE estimates SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(updates), id);
}

function deleteEstimate(id) {
  db.prepare('DELETE FROM estimate_line_items WHERE estimate_id = ?').run(id);
  db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
}

function deleteEstimateAndRestore(id) {
  const lineItemIds = db.prepare('SELECT line_item_id FROM estimate_line_items WHERE estimate_id = ? AND line_item_id IS NOT NULL').all(id).map(r => r.line_item_id);
  db.prepare('DELETE FROM estimate_line_items WHERE estimate_id = ?').run(id);
  db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
  if (lineItemIds.length > 0) {
    const placeholders = lineItemIds.map(() => '?').join(',');
    db.prepare(`UPDATE line_items SET status = 'unbilled' WHERE id IN (${placeholders})`).run(...lineItemIds);
  }
}

// ── Payments ──

function getPayments(clientId) {
  return db.prepare(`
    SELECT p.*, i.invoice_number FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.client_id = ? ORDER BY p.payment_date DESC
  `).all(clientId);
}

function addPayment(data) {
  const result = db.prepare('INSERT INTO payments (client_id, invoice_id, amount, method, payment_date, notes) VALUES (?, ?, ?, ?, ?, ?)').run(
    data.client_id, data.invoice_id, data.amount, data.method || null, data.payment_date || null, data.notes || null
  );

  if (data.invoice_id) {
    const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?').get(data.invoice_id).total;
    const invoice = db.prepare('SELECT total FROM invoices WHERE id = ?').get(data.invoice_id);
    if (invoice && totalPaid >= invoice.total) {
      updateInvoiceStatus(data.invoice_id, 'paid');
    }
  }

  return result.lastInsertRowid;
}

function getPaymentReceipt(paymentId) {
  return db.prepare(`
    SELECT p.*, i.invoice_number, c.first_name, c.last_name, c.company
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).get(paymentId);
}

// ── Templates ──

function getTemplates(type) {
  if (type) {
    return db.prepare('SELECT * FROM document_templates WHERE type = ? ORDER BY name').all(type);
  }
  return db.prepare('SELECT * FROM document_templates ORDER BY type, name').all();
}

function getTemplate(id) {
  return db.prepare('SELECT * FROM document_templates WHERE id = ?').get(id);
}

function saveTemplate(data) {
  if (data.id) {
    db.prepare('UPDATE document_templates SET name = ?, type = ?, blocks_json = ?, is_default = ? WHERE id = ?').run(data.name, data.type, data.blocks_json, data.is_default || 0, data.id);
    return data.id;
  }
  return db.prepare('INSERT INTO document_templates (name, type, blocks_json, is_default) VALUES (?, ?, ?, ?)').run(data.name, data.type, data.blocks_json, data.is_default || 0).lastInsertRowid;
}

function deleteTemplate(id) {
  db.prepare('DELETE FROM document_templates WHERE id = ?').run(id);
}

function setDefaultTemplate(id, type) {
  db.prepare('UPDATE document_templates SET is_default = 0 WHERE type = ?').run(type);
  db.prepare('UPDATE document_templates SET is_default = 1 WHERE id = ?').run(id);
}

// ── Settings ──

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const row of rows) obj[row.key] = row.value;
  return obj;
}

function getSettingValue(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function saveSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function saveSettings(obj) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) stmt.run(key, value);
  });
  tx(Object.entries(obj));
}

// ── Dashboard ──

function getDashboardStats() {
  const clientCount = db.prepare('SELECT COUNT(*) as c FROM clients WHERE archived = 0').get().c;
  const projectCount = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'active'").get().c;
  const unbilledTotal = db.prepare("SELECT COALESCE(SUM(total), 0) as t FROM line_items WHERE status = 'unbilled'").get().t;
  const overdueCount = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'").get().c;
  const outstandingCount = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status IN ('sent', 'overdue')").get().c;
  const outstandingTotal = db.prepare("SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE status IN ('sent', 'overdue')").get().t;
  const paidThisMonth = db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE payment_date >= date('now', 'start of month')").get().t;
  const pendingEstimates = db.prepare("SELECT COUNT(*) as c FROM estimates WHERE status = 'sent'").get().c;

  const recentActivity = db.prepare(`
    SELECT * FROM (
      SELECT 'invoice' as doc_type, i.id, i.invoice_number as number, i.total as amount, i.status,
        i.invoice_date as date, c.company, c.first_name, c.last_name, c.is_company
      FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
      UNION ALL
      SELECT 'estimate' as doc_type, e.id, e.estimate_number as number, e.total as amount, e.status,
        e.estimate_date as date, c.company, c.first_name, c.last_name, c.is_company
      FROM estimates e LEFT JOIN clients c ON e.client_id = c.id
      UNION ALL
      SELECT 'payment' as doc_type, p.id, inv.invoice_number as number, p.amount, 'paid' as status,
        p.payment_date as date, c.company, c.first_name, c.last_name, c.is_company
      FROM payments p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN invoices inv ON p.invoice_id = inv.id
    ) ORDER BY date DESC LIMIT 10
  `).all();

  const overdueInvoices = db.prepare(`
    SELECT i.*, c.company, c.first_name, c.last_name, c.is_company
    FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.status = 'overdue' ORDER BY i.due_date
  `).all();

  return {
    clientCount, projectCount, unbilledTotal, overdueCount, outstandingCount,
    outstandingTotal, paidThisMonth, pendingEstimates,
    recentActivity, overdueInvoices,
  };
}

function getAllLineItems(filter) {
  let where = '';
  if (filter === 'unbilled') where = "WHERE li.status = 'unbilled'";
  else if (filter === 'invoiced') where = "WHERE li.status = 'invoiced'";

  return db.prepare(`
    SELECT li.*, c.name as category_name, t.name as tax_name, t.rate as tax_rate,
      p.name as project_name, cl.company as client_company, cl.first_name as client_first, cl.last_name as client_last, cl.is_company as client_is_company
    FROM line_items li
    LEFT JOIN categories c ON li.category_id = c.id
    LEFT JOIN taxes t ON li.tax_id = t.id
    LEFT JOIN projects p ON li.project_id = p.id
    LEFT JOIN clients cl ON p.client_id = cl.id
    ${where}
    ORDER BY li.created_at DESC
  `).all();
}

function getUnfiledLineItems() {
  return db.prepare(`
    SELECT li.*, c.name as category_name
    FROM line_items li
    LEFT JOIN categories c ON li.category_id = c.id
    WHERE li.project_id IS NULL
    ORDER BY li.created_at DESC
  `).all();
}

function getPendingEstimates() {
  return db.prepare(`
    SELECT e.*, c.company, c.first_name, c.last_name, c.is_company
    FROM estimates e LEFT JOIN clients c ON e.client_id = c.id
    WHERE e.status = 'sent' ORDER BY e.created_at DESC
  `).all();
}

function getIncomeByClient(startDate, endDate) {
  return db.prepare(`
    SELECT c.id, c.company, c.first_name, c.last_name, c.is_company,
      COALESCE(SUM(p.amount), 0) as total_paid,
      COUNT(DISTINCT i.id) as invoice_count
    FROM clients c
    LEFT JOIN invoices i ON i.client_id = c.id AND i.invoice_date >= ? AND i.invoice_date <= ?
    LEFT JOIN payments p ON p.invoice_id = i.id AND p.payment_date >= ? AND p.payment_date <= ?
    WHERE c.archived = 0
    GROUP BY c.id HAVING total_paid > 0
    ORDER BY total_paid DESC
  `).all(startDate, endDate, startDate, endDate);
}

function getTaxCollected(startDate, endDate) {
  return db.prepare(`
    SELECT COALESCE(SUM(ili.tax_amount), 0) as total_tax, t_name as tax_name
    FROM (
      SELECT ili.tax_amount, ili.tax_name as t_name FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      WHERE i.invoice_date >= ? AND i.invoice_date <= ?
    ) GROUP BY t_name
  `).all(startDate, endDate);
}

module.exports = {
  initDatabase, getDb,
  // Client Groups
  getClientGroups, saveClientGroup, deleteClientGroup, reorderClientGroups,
  // Clients
  getClients, getClient, getClientSummary, createClient, updateClient, archiveClient, moveClientToGroup,
  // Projects
  getProjects, getProject, createProject, updateProject, archiveProject,
  // Line Items
  getLineItems, getUnbilledLineItems, createLineItem, updateLineItem, deleteLineItem, markLineItemsInvoiced,
  // Categories
  getCategories, saveCategory, deleteCategory, reorderCategories,
  // Taxes
  getTaxes, saveTax, deleteTax, setDefaultTax,
  // Invoices
  getInvoices, getInvoice, createInvoice, updateInvoice, updateInvoiceStatus, deleteInvoice, deleteInvoiceAndRestore, convertEstimateToInvoice,
  // Estimates
  getEstimates, getEstimate, createEstimate, updateEstimate, updateEstimateStatus, deleteEstimate, deleteEstimateAndRestore,
  // Payments
  getPayments, addPayment, getPaymentReceipt,
  // Templates
  getTemplates, getTemplate, saveTemplate, deleteTemplate, setDefaultTemplate,
  // Settings
  getSettings, getSettingValue, saveSetting, saveSettings,
  // Dashboard
  getDashboardStats,
  getAllLineItems, getUnfiledLineItems, getPendingEstimates,
  getIncomeByClient, getTaxCollected,
};
