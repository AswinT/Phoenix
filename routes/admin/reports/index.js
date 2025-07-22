/**
 * Admin Reports Routes
 * Handles sales reports, analytics, and data export functionality
 * 
 * @description Routes for generating and viewing various business reports
 * @routes /admin/reports/*
 */

const express = require('express');
const reportsRouter = express.Router();

// Import controllers with descriptive names
const salesController = require('../../../controllers/adminController/salesController');

// Import middleware
const { isAdminAuthenticated } = require('../../../middlewares/adminMiddleware');

/**
 * @route GET /admin/reports
 * @description Display reports dashboard with overview
 * @access Private (Admin only)
 */
reportsRouter.get('/',
  isAdminAuthenticated,
  salesController.getSales
);

/**
 * @route GET /admin/reports/sales
 * @description Display sales reports page
 * @access Private (Admin only)
 */
reportsRouter.get('/sales',
  isAdminAuthenticated,
  salesController.getSales
);

/**
 * @route GET /admin/reports/sales/daily
 * @description Generate daily sales report
 * @access Private (Admin only)
 */
reportsRouter.get('/sales/daily',
  isAdminAuthenticated,
  salesController.generateDailySalesReport
);

/**
 * @route GET /admin/reports/sales/weekly
 * @description Generate weekly sales report
 * @access Private (Admin only)
 */
reportsRouter.get('/sales/weekly',
  isAdminAuthenticated,
  salesController.generateWeeklySalesReport
);

/**
 * @route GET /admin/reports/sales/monthly
 * @description Generate monthly sales report
 * @access Private (Admin only)
 */
reportsRouter.get('/sales/monthly',
  isAdminAuthenticated,
  salesController.generateMonthlySalesReport
);

/**
 * @route GET /admin/reports/sales/yearly
 * @description Generate yearly sales report
 * @access Private (Admin only)
 */
reportsRouter.get('/sales/yearly',
  isAdminAuthenticated,
  salesController.generateYearlySalesReport
);

/**
 * @route GET /admin/reports/sales/custom
 * @description Generate custom date range sales report
 * @access Private (Admin only)
 */
reportsRouter.get('/sales/custom',
  isAdminAuthenticated,
  salesController.generateCustomSalesReport
);

/**
 * @route POST /admin/reports/sales/export
 * @description Export sales report to Excel/PDF
 * @access Private (Admin only)
 */
// reportsRouter.post('/sales/export',
//   isAdminAuthenticated,
//   salesController.exportSalesReport // TODO: Use exportToExcel or exportToPDF
// );

/**
 * @route GET /admin/reports/products
 * @description Display product performance reports
 * @access Private (Admin only)
 * Note: This method doesn't exist in salesController, commenting out for now
 */
// reportsRouter.get('/products',
//   isAdminAuthenticated,
//   salesController.getProductPerformanceReports
// );

/**
 * @route GET /admin/reports/customers
 * @description Display customer analytics reports
 * @access Private (Admin only)
 * Note: This method doesn't exist in salesController, commenting out for now
 */
// reportsRouter.get('/customers',
//   isAdminAuthenticated,
//   salesController.getCustomerAnalyticsReports
// );

/**
 * @route GET /admin/reports/inventory
 * @description Display inventory reports
 * @access Private (Admin only)
 * Note: This method doesn't exist in salesController, commenting out for now
 */
// reportsRouter.get('/inventory',
//   isAdminAuthenticated,
//   salesController.getInventoryReports
// );

/**
 * @route GET /admin/reports/financial
 * @description Display financial reports
 * @access Private (Admin only)
 * Note: This method doesn't exist in salesController, commenting out for now
 */
// reportsRouter.get('/financial',
//   isAdminAuthenticated,
//   salesController.getFinancialReports
// );

module.exports = reportsRouter;
