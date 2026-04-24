const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const config = require('./config');

let mainWindow;

// Check if Vite dev server is intended (only when dist-renderer doesn't exist)
const distPath = path.join(__dirname, '..', '..', 'dist-renderer', 'index.html');
const isDev = !app.isPackaged && !fs.existsSync(distPath);

function createWindow() {
  const windowState = config.getWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width || 1280,
    height: windowState.height || 860,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1100,
    minHeight: 720,
    title: 'Krull D+A Billings',
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '..', '..', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico'),
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  // Spellcheck context menu with suggestions
  mainWindow.webContents.on('context-menu', (event, params) => {
    if (params.misspelledWord) {
      const { Menu, MenuItem } = require('electron');
      const menu = new Menu();
      for (const suggestion of params.dictionarySuggestions.slice(0, 5)) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        }));
      }
      if (params.dictionarySuggestions.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }));
      }
      menu.append(new MenuItem({
        label: 'Add to Dictionary',
        click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }));
      menu.popup();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', 'index.html'));
  }

  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    config.saveWindowState(bounds);

    // Auto-backup on close (skip if a restore is pending)
    try {
      const dbPath = db.getDbPath();
      const pendingRestore = dbPath + '.pending-restore';
      if (!fs.existsSync(pendingRestore)) {
        const settings = db.getSettings();
        const backupFolder = settings.backup_folder;
        if (backupFolder && fs.existsSync(backupFolder)) {
          const dest = path.join(backupFolder, 'krull-billings-latest.db');
          fs.copyFileSync(dbPath, dest);
        }
      }
    } catch (err) {
      console.error('Auto-backup failed:', err);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Clean up any stale pending restore
  const dbPath = path.join(app.getPath('userData'), 'krull-billings.db');
  const pendingPath = dbPath + '.pending-restore';
  if (fs.existsSync(pendingPath)) {
    try { fs.unlinkSync(pendingPath); } catch (err) { /* ignore */ }
  }

  db.initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──

function registerIpcHandlers() {
  // Client Groups
  ipcMain.handle('getClientGroups', () => db.getClientGroups());
  ipcMain.handle('saveClientGroup', (_, data) => db.saveClientGroup(data));
  ipcMain.handle('deleteClientGroup', (_, id) => db.deleteClientGroup(id));
  ipcMain.handle('reorderClientGroups', (_, orderedIds) => db.reorderClientGroups(orderedIds));

  // Clients
  ipcMain.handle('getClients', (_, groupId) => db.getClients(groupId));
  ipcMain.handle('getUnfiledClients', () => db.getUnfiledClients());
  ipcMain.handle('getClient', (_, id) => db.getClient(id));
  ipcMain.handle('getClientSummary', (_, id) => db.getClientSummary(id));
  ipcMain.handle('createClient', (_, data) => db.createClient(data));
  ipcMain.handle('updateClient', (_, id, data) => db.updateClient(id, data));
  ipcMain.handle('archiveClient', (_, id) => db.archiveClient(id));
  ipcMain.handle('moveClientToGroup', (_, clientId, groupId) => db.moveClientToGroup(clientId, groupId));

  // Projects
  ipcMain.handle('getProjects', (_, clientId) => db.getProjects(clientId));
  ipcMain.handle('getProject', (_, id) => db.getProject(id));
  ipcMain.handle('createProject', (_, data) => db.createProject(data));
  ipcMain.handle('updateProject', (_, id, data) => db.updateProject(id, data));
  ipcMain.handle('archiveProject', (_, id) => db.archiveProject(id));

  // Line Items
  ipcMain.handle('getLineItems', (_, projectId) => db.getLineItems(projectId));
  ipcMain.handle('getUnbilledLineItems', (_, projectId) => db.getUnbilledLineItems(projectId));
  ipcMain.handle('getWorkingLineItems', (_, projectId) => db.getWorkingLineItems(projectId));
  ipcMain.handle('createLineItem', (_, data) => db.createLineItem(data));
  ipcMain.handle('updateLineItem', (_, id, data) => db.updateLineItem(id, data));
  ipcMain.handle('deleteLineItem', (_, id) => db.deleteLineItem(id));
  ipcMain.handle('duplicateLineItem', (_, id, overrides) => db.duplicateLineItem(id, overrides));
  ipcMain.handle('reorderLineItems', (_, orderedIds) => db.reorderLineItems(orderedIds));
  ipcMain.handle('markLineItemsInvoiced', (_, ids) => db.markLineItemsInvoiced(ids));

  // Categories
  ipcMain.handle('getCategories', () => db.getCategories());
  ipcMain.handle('saveCategory', (_, data) => db.saveCategory(data));
  ipcMain.handle('deleteCategory', (_, id) => db.deleteCategory(id));
  ipcMain.handle('reorderCategories', (_, orderedIds) => db.reorderCategories(orderedIds));

  // Taxes
  ipcMain.handle('getTaxes', () => db.getTaxes());
  ipcMain.handle('saveTax', (_, data) => db.saveTax(data));
  ipcMain.handle('deleteTax', (_, id) => db.deleteTax(id));
  ipcMain.handle('setDefaultTax', (_, id) => db.setDefaultTax(id));

  // Invoices
  ipcMain.handle('getInvoices', (_, clientId) => db.getInvoices(clientId));
  ipcMain.handle('getInvoice', (_, id) => db.getInvoice(id));
  ipcMain.handle('createInvoice', (_, data, lineItemIds) => db.createInvoice(data, lineItemIds));
  ipcMain.handle('updateInvoice', (_, id, data) => db.updateInvoice(id, data));
  ipcMain.handle('updateInvoiceStatus', (_, id, status) => db.updateInvoiceStatus(id, status));
  ipcMain.handle('deleteInvoice', (_, id) => db.deleteInvoice(id));
  ipcMain.handle('deleteInvoiceAndRestore', (_, id) => db.deleteInvoiceAndRestore(id));
  ipcMain.handle('convertEstimateToInvoice', (_, estimateId) => db.convertEstimateToInvoice(estimateId));

  // Estimates
  ipcMain.handle('getEstimates', (_, clientId) => db.getEstimates(clientId));
  ipcMain.handle('getEstimate', (_, id) => db.getEstimate(id));
  ipcMain.handle('createEstimate', (_, data, lineItemIds) => db.createEstimate(data, lineItemIds));
  ipcMain.handle('updateEstimate', (_, id, data) => db.updateEstimate(id, data));
  ipcMain.handle('updateEstimateStatus', (_, id, status) => db.updateEstimateStatus(id, status));
  ipcMain.handle('deleteEstimate', (_, id) => db.deleteEstimate(id));
  ipcMain.handle('deleteEstimateAndRestore', (_, id) => db.deleteEstimateAndRestore(id));

  // Payments
  ipcMain.handle('getPayments', (_, clientId) => db.getPayments(clientId));
  ipcMain.handle('addPayment', (_, data) => db.addPayment(data));
  ipcMain.handle('deletePayment', (_, paymentId) => db.deletePayment(paymentId));
  ipcMain.handle('getPaymentReceipt', (_, paymentId) => db.getPaymentReceipt(paymentId));

  // Statements
  ipcMain.handle('getStatements', (_, clientId) => db.getStatements(clientId));
  ipcMain.handle('getStatement', (_, id) => db.getStatement(id));
  ipcMain.handle('createStatement', (_, data) => db.createStatement(data));
  ipcMain.handle('deleteStatement', (_, id) => db.deleteStatement(id));

  // Templates
  ipcMain.handle('getTemplates', (_, type) => db.getTemplates(type));
  ipcMain.handle('getTemplate', (_, id) => db.getTemplate(id));
  ipcMain.handle('saveTemplate', (_, data) => db.saveTemplate(data));
  ipcMain.handle('deleteTemplate', (_, id) => db.deleteTemplate(id));
  ipcMain.handle('setDefaultTemplate', (_, id, type) => db.setDefaultTemplate(id, type));

  // PDF + Email
  ipcMain.handle('generatePdfHtml', (_, docType, docId) => {
    const pdf = require('./pdf');
    return pdf.generateHtml(docType, docId);
  });
  ipcMain.handle('generatePdf', async (_, docType, docId) => {
    const pdf = require('./pdf');
    return pdf.generate(docType, docId);
  });
  ipcMain.handle('sendEmail', async (_, docType, docId, opts) => {
    const email = require('./email');
    return email.send(docType, docId, opts);
  });
  // Auto-save PDF to a chosen folder (no dialog)
  ipcMain.handle('savePdfAs', async (_, sourcePath, defaultFilename, folderPath) => {
    if (folderPath && sourcePath) {
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
      const dest = path.join(folderPath, defaultFilename || 'document.pdf');
      fs.copyFileSync(sourcePath, dest);
      return dest;
    }
    // Fallback: show save dialog if no folder set
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFilename || 'document.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.filePath && sourcePath) {
      fs.copyFileSync(sourcePath, result.filePath);
      return result.filePath;
    }
    return null;
  });
  // Choose a folder for saving PDFs
  ipcMain.handle('chooseSaveFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose save folder',
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('printPdf', async (_, pdfPath) => {
    if (pdfPath) {
      shell.openPath(pdfPath);
    }
    return null;
  });
  ipcMain.handle('openPdf', async (_, pdfPath) => {
    if (pdfPath) {
      shell.openPath(pdfPath);
    }
    return null;
  });

  // Backup & Restore
  ipcMain.handle('chooseBackupFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose backup folder',
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('backupDatabase', async (_, folderPath) => {
    const dbPath = db.getDbPath();
    if (!folderPath) throw new Error('No backup folder specified');
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `krull-billings-backup-${timestamp}.db`;
    const dest = path.join(folderPath, filename);
    fs.copyFileSync(dbPath, dest);
    return { path: dest, filename };
  });
  ipcMain.handle('chooseRestoreFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select backup file to restore',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('restoreDatabase', async (_, backupPath) => {
    if (!backupPath || !fs.existsSync(backupPath)) throw new Error('Backup file not found');
    const dbPath = db.getDbPath();
    // Stage the backup file — it will be swapped in on next launch
    const pendingPath = dbPath + '.pending-restore';
    fs.copyFileSync(backupPath, pendingPath);
    return true;
  });
  ipcMain.handle('chooseBilingsProDb', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select import database file (.db)',
      filters: [{ name: 'Database', extensions: ['db', 'bid'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('importBillingsPro', async (_, importDbPath) => {
    if (!importDbPath || !fs.existsSync(importDbPath)) throw new Error('Import file not found');
    // Copy to temp location to avoid macOS sandbox/permission issues
    const os = require('os');
    const tmpPath = path.join(os.tmpdir(), 'krull-import-temp.db');
    fs.copyFileSync(importDbPath, tmpPath);
    const Database = require('better-sqlite3');
    const src = new Database(tmpPath, { readonly: true });
    const dest = db.getDb();

    const counts = {};

    // Import client groups
    const groups = src.prepare('SELECT * FROM client_groups').all();
    const groupMap = {};
    const insertGroup = dest.prepare('INSERT INTO client_groups (name, sort_order) VALUES (?, ?)');
    for (const g of groups) {
      const existing = dest.prepare('SELECT id FROM client_groups WHERE name = ?').get(g.name);
      if (existing) { groupMap[g.id] = existing.id; }
      else { groupMap[g.id] = insertGroup.run(g.name, g.sort_order || 0).lastInsertRowid; }
    }
    counts.groups = groups.length;

    // Import categories
    const cats = src.prepare('SELECT * FROM categories').all();
    const catMap = {};
    for (const c of cats) {
      const existing = dest.prepare('SELECT id FROM categories WHERE name = ?').get(c.name);
      if (existing) { catMap[c.id] = existing.id; }
      else { catMap[c.id] = dest.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(c.name, c.sort_order || 0).lastInsertRowid; }
    }
    counts.categories = cats.length;

    // Import clients
    const clients = src.prepare('SELECT * FROM clients').all();
    const clientMap = {};
    for (const c of clients) {
      const r = dest.prepare(`INSERT INTO clients (group_id, first_name, last_name, company, is_company, email, phone,
        address_street, address_city, address_state, address_postcode, address_country,
        client_number, tax_id, hourly_rate, mileage_rate, currency, retainer_balance, archived, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        groupMap[c.group_id] || null, c.first_name, c.last_name, c.company, c.is_company,
        c.email, c.phone, c.address_street, c.address_city, c.address_state,
        c.address_postcode, c.address_country, c.client_number, c.tax_id,
        c.hourly_rate || 0, c.mileage_rate || 0, c.currency || 'AUD',
        c.retainer_balance || 0, c.archived || 0, c.created_at);
      clientMap[c.id] = r.lastInsertRowid;
    }
    counts.clients = clients.length;

    // Import projects
    const projects = src.prepare('SELECT * FROM projects').all();
    const projMap = {};
    for (const p of projects) {
      const cid = clientMap[p.client_id];
      if (!cid) continue;
      const r = dest.prepare('INSERT INTO projects (client_id, name, status, due_date, notes, created_at) VALUES (?,?,?,?,?,?)').run(
        cid, p.name, p.status || 'active', p.due_date, p.notes, p.created_at);
      projMap[p.id] = r.lastInsertRowid;
    }
    counts.projects = projects.length;

    // Import line items (if source has them)
    const lineItemMap = {};
    try {
      const lineItems = src.prepare('SELECT * FROM line_items').all();
      for (const li of lineItems) {
        const pid = projMap[li.project_id];
        if (!pid) continue;
        const cid = catMap[li.category_id] || null;
        const tid = li.tax_id || null;
        const r = dest.prepare(`INSERT INTO line_items (project_id, category_id, name, kind, billable, duration_seconds,
          rate, quantity, markup_pct, discount_pct, tax_id, subtotal, markup_amount, discount_amount, tax_amount, total,
          status, notes, date, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
          pid, cid, li.name, li.kind || 'fixed', li.billable ?? 1, li.duration_seconds || 0,
          li.rate || 0, li.quantity || 1, li.markup_pct || 0, li.discount_pct || 0, tid,
          li.subtotal || 0, li.markup_amount || 0, li.discount_amount || 0, li.tax_amount || 0, li.total || 0,
          li.status || 'unbilled', li.notes, li.date, li.created_at);
        lineItemMap[li.id] = r.lastInsertRowid;
      }
      counts.lineItems = lineItems.length;
    } catch (e) {
      // Source database may not have a line_items table — reconstruct from estimate_line_items below
      counts.lineItems = 0;
    }

    // Import invoices
    const invoices = src.prepare('SELECT * FROM invoices').all();
    const invMap = {};
    let invSkipped = 0;
    for (const inv of invoices) {
      const cid = clientMap[inv.client_id];
      if (!cid) continue;
      const pid = projMap[inv.project_id] || null;
      // Skip if invoice number already exists
      const existing = dest.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(inv.invoice_number);
      if (existing) { invMap[inv.id] = existing.id; invSkipped++; continue; }
      const r = dest.prepare(`INSERT INTO invoices (client_id, project_id, invoice_number, status, currency,
        invoice_date, due_date, subtotal, tax_total, total, notes, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        cid, pid, inv.invoice_number, inv.status, inv.currency || 'AUD',
        inv.invoice_date, inv.due_date, inv.subtotal || 0, inv.tax_total || 0,
        inv.total || 0, inv.notes, inv.created_at);
      invMap[inv.id] = r.lastInsertRowid;
    }
    counts.invoices = invoices.length - invSkipped;

    // Import invoice line items
    const invLines = src.prepare('SELECT * FROM invoice_line_items').all();
    let ilc = 0;
    for (const li of invLines) {
      const iid = invMap[li.invoice_id];
      if (!iid) continue;
      const lid = lineItemMap[li.line_item_id] || null;
      dest.prepare(`INSERT INTO invoice_line_items (invoice_id, line_item_id, category_name, name, kind, quantity, rate,
        tax_name, tax_rate, subtotal, tax_amount, total, sort_order)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        iid, lid, li.category_name, li.name, li.kind || 'fixed', li.quantity || 1, li.rate || 0,
        li.tax_name, li.tax_rate || 0, li.subtotal || 0, li.tax_amount || 0, li.total || 0, li.sort_order || 0);
      ilc++;
    }
    counts.invoiceLines = ilc;

    // Import estimates
    const estimates = src.prepare('SELECT * FROM estimates').all();
    const estMap = {};
    let estSkipped = 0;
    for (const est of estimates) {
      const cid = clientMap[est.client_id];
      if (!cid) continue;
      const pid = projMap[est.project_id] || null;
      const existing = dest.prepare('SELECT id FROM estimates WHERE estimate_number = ?').get(est.estimate_number);
      if (existing) { estMap[est.id] = existing.id; estSkipped++; continue; }
      const r = dest.prepare(`INSERT INTO estimates (client_id, project_id, estimate_number, status, currency,
        estimate_date, expiry_date, subtotal, tax_total, total, notes, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        cid, pid, est.estimate_number, est.status, est.currency || 'AUD',
        est.estimate_date, est.expiry_date, est.subtotal || 0, est.tax_total || 0,
        est.total || 0, est.notes, est.created_at);
      estMap[est.id] = r.lastInsertRowid;
    }
    counts.estimates = estimates.length - estSkipped;

    // Import estimate line items
    const estLines = src.prepare('SELECT * FROM estimate_line_items').all();
    let elc = 0;
    for (const li of estLines) {
      const eid = estMap[li.estimate_id];
      if (!eid) continue;
      const lid = lineItemMap[li.line_item_id] || null;
      dest.prepare(`INSERT INTO estimate_line_items (estimate_id, line_item_id, category_name, name, quantity, rate,
        tax_name, tax_rate, subtotal, tax_amount, total, sort_order)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        eid, lid, li.category_name, li.name, li.quantity || 1, li.rate || 0,
        li.tax_name, li.tax_rate || 0, li.subtotal || 0, li.tax_amount || 0, li.total || 0, li.sort_order || 0);
      elc++;
    }
    counts.estimateLines = elc;

    // If no line_items were imported, reconstruct them from estimate/invoice line item snapshots
    if (counts.lineItems === 0) {
      let reconstructed = 0;
      // Reconstruct from estimate line items first (these are unbilled)
      const estLIs = dest.prepare(`
        SELECT eli.*, e.project_id FROM estimate_line_items eli
        JOIN estimates e ON eli.estimate_id = e.id
        WHERE eli.line_item_id IS NULL AND e.project_id IS NOT NULL
      `).all();
      for (const li of estLIs) {
        const r = dest.prepare(`INSERT INTO line_items (project_id, name, kind, rate, quantity, subtotal, tax_amount, total, status, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
          li.project_id, li.name, 'fixed', li.rate || 0, li.quantity || 1,
          li.subtotal || 0, li.tax_amount || 0, li.total || 0, 'unbilled');
        dest.prepare('UPDATE estimate_line_items SET line_item_id = ? WHERE id = ?').run(r.lastInsertRowid, li.id);
        reconstructed++;
      }
      // Reconstruct from invoice line items (these are invoiced)
      const invLIs = dest.prepare(`
        SELECT ili.*, i.project_id FROM invoice_line_items ili
        JOIN invoices i ON ili.invoice_id = i.id
        WHERE ili.line_item_id IS NULL AND i.project_id IS NOT NULL
      `).all();
      for (const li of invLIs) {
        // Check if an estimate line item already created this line item (by matching name + project)
        const existing = dest.prepare('SELECT id FROM line_items WHERE project_id = ? AND name = ? AND total = ?').get(li.project_id, li.name, li.total || 0);
        if (existing) {
          dest.prepare('UPDATE invoice_line_items SET line_item_id = ? WHERE id = ?').run(existing.id, li.id);
          dest.prepare("UPDATE line_items SET status = 'invoiced' WHERE id = ?").run(existing.id);
        } else {
          const r = dest.prepare(`INSERT INTO line_items (project_id, name, kind, rate, quantity, subtotal, tax_amount, total, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
            li.project_id, li.name, li.kind || 'fixed', li.rate || 0, li.quantity || 1,
            li.subtotal || 0, li.tax_amount || 0, li.total || 0, 'invoiced');
          dest.prepare('UPDATE invoice_line_items SET line_item_id = ? WHERE id = ?').run(r.lastInsertRowid, li.id);
          reconstructed++;
        }
      }
      counts.lineItems = reconstructed;
    }

    // Import payments
    const payments = src.prepare('SELECT * FROM payments').all();
    let pc = 0;
    for (const p of payments) {
      const cid = clientMap[p.client_id];
      if (!cid) continue;
      const iid = invMap[p.invoice_id] || null;
      dest.prepare('INSERT INTO payments (client_id, invoice_id, amount, method, payment_date, notes, created_at) VALUES (?,?,?,?,?,?,?)').run(
        cid, iid, p.amount, p.method, p.payment_date, p.notes, p.created_at);
      pc++;
    }
    counts.payments = pc;

    // Update next numbers
    const maxInv = src.prepare("SELECT MAX(CAST(invoice_number AS INTEGER)) as m FROM invoices").get();
    const maxEst = src.prepare("SELECT MAX(CAST(estimate_number AS INTEGER)) as m FROM estimates").get();
    if (maxInv?.m) dest.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('invoice_next_number', ?)").run(String(maxInv.m + 1));
    if (maxEst?.m) dest.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('estimate_next_number', ?)").run(String(maxEst.m + 1));

    src.close();
    try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
    return counts;
  });

  // Settings
  ipcMain.handle('getSettings', () => db.getSettings());
  ipcMain.handle('saveSetting', (_, key, value) => db.saveSetting(key, value));
  ipcMain.handle('saveSettings', (_, obj) => db.saveSettings(obj));
  ipcMain.handle('uploadLogo', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const sourcePath = result.filePaths[0];
    const dest = path.join(app.getPath('userData'), 'logo' + path.extname(sourcePath));
    fs.copyFileSync(sourcePath, dest);
    db.saveSetting('logo_path', dest);
    return dest;
  });
  ipcMain.handle('testSmtp', async (_, smtpConfig) => {
    try {
      const email = require('./email');
      return await email.testConnection(smtpConfig);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Dashboard + Reports
  ipcMain.handle('getDashboardStats', () => db.getDashboardStats());
  ipcMain.handle('getAllLineItems', (_, filter) => db.getAllLineItems(filter));
  ipcMain.handle('getUnfiledLineItems', () => db.getUnfiledLineItems());
  ipcMain.handle('getPendingEstimates', () => db.getPendingEstimates());
  ipcMain.handle('getIncomeByClient', (_, startDate, endDate) => db.getIncomeByClient(startDate, endDate));
  ipcMain.handle('getTaxCollected', (_, startDate, endDate) => db.getTaxCollected(startDate, endDate));
}
