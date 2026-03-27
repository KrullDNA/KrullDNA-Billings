const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Client Groups
  getClientGroups: () => ipcRenderer.invoke('getClientGroups'),
  saveClientGroup: (data) => ipcRenderer.invoke('saveClientGroup', data),
  deleteClientGroup: (id) => ipcRenderer.invoke('deleteClientGroup', id),
  reorderClientGroups: (orderedIds) => ipcRenderer.invoke('reorderClientGroups', orderedIds),

  // Clients
  getClients: (groupId) => ipcRenderer.invoke('getClients', groupId),
  getClient: (id) => ipcRenderer.invoke('getClient', id),
  createClient: (data) => ipcRenderer.invoke('createClient', data),
  updateClient: (id, data) => ipcRenderer.invoke('updateClient', id, data),
  archiveClient: (id) => ipcRenderer.invoke('archiveClient', id),
  moveClientToGroup: (clientId, groupId) => ipcRenderer.invoke('moveClientToGroup', clientId, groupId),

  // Projects
  getProjects: (clientId) => ipcRenderer.invoke('getProjects', clientId),
  getProject: (id) => ipcRenderer.invoke('getProject', id),
  createProject: (data) => ipcRenderer.invoke('createProject', data),
  updateProject: (id, data) => ipcRenderer.invoke('updateProject', id, data),
  archiveProject: (id) => ipcRenderer.invoke('archiveProject', id),

  // Line Items
  getLineItems: (projectId) => ipcRenderer.invoke('getLineItems', projectId),
  getUnbilledLineItems: (projectId) => ipcRenderer.invoke('getUnbilledLineItems', projectId),
  createLineItem: (data) => ipcRenderer.invoke('createLineItem', data),
  updateLineItem: (id, data) => ipcRenderer.invoke('updateLineItem', id, data),
  deleteLineItem: (id) => ipcRenderer.invoke('deleteLineItem', id),
  markLineItemsInvoiced: (ids) => ipcRenderer.invoke('markLineItemsInvoiced', ids),

  // Categories
  getCategories: () => ipcRenderer.invoke('getCategories'),
  saveCategory: (data) => ipcRenderer.invoke('saveCategory', data),
  deleteCategory: (id) => ipcRenderer.invoke('deleteCategory', id),
  reorderCategories: (orderedIds) => ipcRenderer.invoke('reorderCategories', orderedIds),

  // Taxes
  getTaxes: () => ipcRenderer.invoke('getTaxes'),
  saveTax: (data) => ipcRenderer.invoke('saveTax', data),
  deleteTax: (id) => ipcRenderer.invoke('deleteTax', id),
  setDefaultTax: (id) => ipcRenderer.invoke('setDefaultTax', id),

  // Invoices
  getInvoices: (clientId) => ipcRenderer.invoke('getInvoices', clientId),
  getInvoice: (id) => ipcRenderer.invoke('getInvoice', id),
  createInvoice: (data, lineItemIds) => ipcRenderer.invoke('createInvoice', data, lineItemIds),
  updateInvoice: (id, data) => ipcRenderer.invoke('updateInvoice', id, data),
  updateInvoiceStatus: (id, status) => ipcRenderer.invoke('updateInvoiceStatus', id, status),
  deleteInvoice: (id) => ipcRenderer.invoke('deleteInvoice', id),
  convertEstimateToInvoice: (estimateId) => ipcRenderer.invoke('convertEstimateToInvoice', estimateId),

  // Estimates
  getEstimates: (clientId) => ipcRenderer.invoke('getEstimates', clientId),
  getEstimate: (id) => ipcRenderer.invoke('getEstimate', id),
  createEstimate: (data, lineItemIds) => ipcRenderer.invoke('createEstimate', data, lineItemIds),
  updateEstimate: (id, data) => ipcRenderer.invoke('updateEstimate', id, data),
  updateEstimateStatus: (id, status) => ipcRenderer.invoke('updateEstimateStatus', id, status),
  deleteEstimate: (id) => ipcRenderer.invoke('deleteEstimate', id),

  // Payments
  getPayments: (clientId) => ipcRenderer.invoke('getPayments', clientId),
  addPayment: (data) => ipcRenderer.invoke('addPayment', data),
  getPaymentReceipt: (paymentId) => ipcRenderer.invoke('getPaymentReceipt', paymentId),

  // Templates
  getTemplates: (type) => ipcRenderer.invoke('getTemplates', type),
  getTemplate: (id) => ipcRenderer.invoke('getTemplate', id),
  saveTemplate: (data) => ipcRenderer.invoke('saveTemplate', data),
  deleteTemplate: (id) => ipcRenderer.invoke('deleteTemplate', id),
  setDefaultTemplate: (id, type) => ipcRenderer.invoke('setDefaultTemplate', id, type),

  // PDF + Email
  generatePdf: (docType, docId) => ipcRenderer.invoke('generatePdf', docType, docId),
  sendEmail: (docType, docId, opts) => ipcRenderer.invoke('sendEmail', docType, docId, opts),
  savePdfAs: (filePath) => ipcRenderer.invoke('savePdfAs', filePath),
  printPdf: (filePath) => ipcRenderer.invoke('printPdf', filePath),

  // Settings
  getSettings: () => ipcRenderer.invoke('getSettings'),
  saveSetting: (key, value) => ipcRenderer.invoke('saveSetting', key, value),
  saveSettings: (obj) => ipcRenderer.invoke('saveSettings', obj),
  uploadLogo: (sourcePath) => ipcRenderer.invoke('uploadLogo', sourcePath),
  testSmtp: (config) => ipcRenderer.invoke('testSmtp', config),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('getDashboardStats'),
});
