const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db');
const config = require('./config');

let mainWindow;
const isDev = !app.isPackaged;

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
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', 'index.html'));
  }

  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    config.saveWindowState(bounds);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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
  ipcMain.handle('createLineItem', (_, data) => db.createLineItem(data));
  ipcMain.handle('updateLineItem', (_, id, data) => db.updateLineItem(id, data));
  ipcMain.handle('deleteLineItem', (_, id) => db.deleteLineItem(id));
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
  ipcMain.handle('convertEstimateToInvoice', (_, estimateId) => db.convertEstimateToInvoice(estimateId));

  // Estimates
  ipcMain.handle('getEstimates', (_, clientId) => db.getEstimates(clientId));
  ipcMain.handle('getEstimate', (_, id) => db.getEstimate(id));
  ipcMain.handle('createEstimate', (_, data, lineItemIds) => db.createEstimate(data, lineItemIds));
  ipcMain.handle('updateEstimate', (_, id, data) => db.updateEstimate(id, data));
  ipcMain.handle('updateEstimateStatus', (_, id, status) => db.updateEstimateStatus(id, status));
  ipcMain.handle('deleteEstimate', (_, id) => db.deleteEstimate(id));

  // Payments
  ipcMain.handle('getPayments', (_, clientId) => db.getPayments(clientId));
  ipcMain.handle('addPayment', (_, data) => db.addPayment(data));
  ipcMain.handle('getPaymentReceipt', (_, paymentId) => db.getPaymentReceipt(paymentId));

  // Templates
  ipcMain.handle('getTemplates', (_, type) => db.getTemplates(type));
  ipcMain.handle('getTemplate', (_, id) => db.getTemplate(id));
  ipcMain.handle('saveTemplate', (_, data) => db.saveTemplate(data));
  ipcMain.handle('deleteTemplate', (_, id) => db.deleteTemplate(id));
  ipcMain.handle('setDefaultTemplate', (_, id, type) => db.setDefaultTemplate(id, type));

  // PDF + Email (stubs for Session 6)
  ipcMain.handle('generatePdf', async (_, docType, docId) => {
    const pdf = require('./pdf');
    return pdf.generate(docType, docId);
  });
  ipcMain.handle('sendEmail', async (_, docType, docId, opts) => {
    const email = require('./email');
    return email.send(docType, docId, opts);
  });
  ipcMain.handle('savePdfAs', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    return result.filePath || null;
  });
  ipcMain.handle('printPdf', async () => {
    // Stub: will be implemented in Session 6
    return null;
  });

  // Settings
  ipcMain.handle('getSettings', () => db.getSettings());
  ipcMain.handle('saveSetting', (_, key, value) => db.saveSetting(key, value));
  ipcMain.handle('saveSettings', (_, obj) => db.saveSettings(obj));
  ipcMain.handle('uploadLogo', async (_, sourcePath) => {
    const fs = require('fs');
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

  // Dashboard
  ipcMain.handle('getDashboardStats', () => db.getDashboardStats());
}
