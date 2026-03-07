// routes/index.js – Centralized router for all Admin API routes
const express = require('express');
const router  = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/upload');

// ── Controllers ───────────────────────────────────────────────────────────────
const auth       = require('../controllers/authController');
const dashboard  = require('../controllers/dashboardController');
const products   = require('../controllers/productController');
const inventory  = require('../controllers/inventoryController');
const blueprints = require('../controllers/blueprintController');
const orders     = require('../controllers/orderController');
const sales      = require('../controllers/salesController');
const mgmt       = require('../controllers/managementController');
const website    = require('../controllers/websiteController');

const adminOnly = [authenticate, authorize('admin')];
const adminStaff = [authenticate, authorize('admin', 'staff')];

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
router.post('/auth/login',           auth.login);
router.get ('/auth/me',              authenticate,        auth.getMe);
router.put ('/auth/profile',         authenticate,        auth.updateProfile);
router.put ('/auth/change-password', authenticate,        auth.changePassword);

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', adminStaff, dashboard.getDashboard);

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════════════════════
router.get   ('/products/report',           adminStaff,  products.getReport);
router.get   ('/products',                  adminStaff,  products.getAll);
router.get   ('/products/:id',              adminStaff,  products.getOne);
router.post  ('/products',                  adminOnly,   upload.uploadProductImage, products.create);
router.put   ('/products/:id',              adminOnly,   upload.uploadProductImage, products.update);
router.delete('/products/:id',              adminOnly,   products.remove);
router.patch ('/products/:id/featured',     adminOnly,   products.toggleFeatured);

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY – RAW MATERIALS
// ══════════════════════════════════════════════════════════════════════════════
router.get   ('/inventory/raw',     adminStaff,  inventory.getRawMaterials);
router.post  ('/inventory/raw',     adminOnly,   inventory.createRawMaterial);
router.put   ('/inventory/raw/:id', adminOnly,   inventory.updateRawMaterial);
router.delete('/inventory/raw/:id', adminOnly,   inventory.deleteRawMaterial);

// SUPPLIERS
router.get   ('/suppliers',     adminStaff, inventory.getSuppliers);
router.post  ('/suppliers',     adminOnly,  inventory.createSupplier);
router.put   ('/suppliers/:id', adminOnly,  inventory.updateSupplier);
router.delete('/suppliers/:id', adminOnly,  inventory.deleteSupplier);

// STOCK MOVEMENTS
router.get ('/inventory/movements',     adminStaff,  inventory.getStockMovements);
router.post('/inventory/movements',     adminStaff,  inventory.createStockMovement);

// ══════════════════════════════════════════════════════════════════════════════
// BLUEPRINTS
// ══════════════════════════════════════════════════════════════════════════════
router.get   ('/blueprints',                   adminStaff,  blueprints.getAll);
router.get   ('/blueprints/:id',               adminStaff,  blueprints.getOne);
router.post  ('/blueprints',                   adminStaff,  upload.uploadBlueprintFile, blueprints.create);
router.put   ('/blueprints/:id',               adminStaff,  upload.uploadBlueprintFile, blueprints.update);
router.delete('/blueprints/:id',               adminStaff,  blueprints.archive);
router.patch ('/blueprints/:id/restore',       adminStaff,  blueprints.restore);
router.get   ('/blueprints/:id/estimation',    adminStaff,  blueprints.getEstimation);
router.post  ('/blueprints/:id/estimation',    adminStaff,  blueprints.saveEstimation);

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════════════════════════
router.get  ('/orders',                              adminStaff, orders.getAll);
router.get  ('/orders/cancellations',                adminOnly,  orders.getCancellations);
router.get  ('/orders/:id',                          adminStaff, orders.getOne);
router.patch('/orders/:id/status',                   adminOnly,  orders.updateStatus);
router.post ('/orders/:id/accept',                   adminOnly,  orders.accept);
router.post ('/orders/:id/decline',                  adminOnly,  orders.decline);
router.post ('/orders/:id/verify-payment',           adminOnly,  orders.verifyPayment);
router.post ('/orders/:id/delivery-receipt',         adminStaff, upload.uploadDeliveryReceipt, orders.uploadDeliveryReceipt);
router.post ('/orders/:id/cancellation',             adminOnly,  orders.processCancellation);

// CONTRACTS
router.get ('/contracts',      adminOnly, mgmt.getContracts);
router.post('/contracts',      adminOnly, mgmt.generateContract);

// ══════════════════════════════════════════════════════════════════════════════
// SALES REPORTS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/sales/report',       adminStaff, sales.getReport);
router.get('/sales/report/print', adminStaff, sales.getPrintData);

// ══════════════════════════════════════════════════════════════════════════════
// WARRANTY
// ══════════════════════════════════════════════════════════════════════════════
router.get  ('/warranty',        adminStaff, mgmt.getAll);
router.patch('/warranty/:id',    adminOnly,  upload.uploadWarrantyProof, mgmt.updateStatus);

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER ACCOUNT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
router.get  ('/customers',             adminOnly, mgmt.getCustomers);
router.patch('/customers/:id/status',  adminOnly, mgmt.updateCustomerStatus);

// ══════════════════════════════════════════════════════════════════════════════
// USER & ROLE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
router.get   ('/users',                 adminOnly, mgmt.getUsers);
router.post  ('/users',                 adminOnly, mgmt.createUser);
router.put   ('/users/:id',             adminOnly, mgmt.updateUser);
router.patch ('/users/:id/password',    adminOnly, mgmt.resetUserPassword);
router.delete('/users/:id',             adminOnly, mgmt.deleteUser);

// ══════════════════════════════════════════════════════════════════════════════
// WEBSITE MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════════
router.get('/website/settings',           adminOnly, website.getSettings);
router.put('/website/settings',           adminOnly, upload.uploadSiteLogo, website.updateSettings);

router.get   ('/website/faqs',            adminOnly, website.getFaqs);
router.post  ('/website/faqs',            adminOnly, website.createFaq);
router.put   ('/website/faqs/:id',        adminOnly, website.updateFaq);
router.delete('/website/faqs/:id',        adminOnly, website.deleteFaq);

router.get('/website/pages',              adminOnly, website.getPages);
router.get('/website/pages/:slug',        adminOnly, website.getPage);
router.put('/website/pages/:slug',        adminOnly, website.updatePage);

// ══════════════════════════════════════════════════════════════════════════════
// BACKUP
// ══════════════════════════════════════════════════════════════════════════════
router.get ('/backup/logs',    adminOnly, website.getBackupLogs);
router.post('/backup/trigger', adminOnly, website.triggerManualBackup);

module.exports = router;
