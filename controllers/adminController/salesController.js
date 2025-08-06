const Order = require('../../models/orderSchema');
const XLSX = require('xlsx');
const { HttpStatus } = require('../../helpers/statusCode');
const getSales = async (req, res) => {
  try {
    const now = new Date();
    let startDate, endDate;
    let reportType = req.query.reportType || 'monthly';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;

    // Validate date parameters if provided
    if (req.query.fromDate && req.query.toDate) {
      const fromDateObj = new Date(req.query.fromDate);
      const toDateObj = new Date(req.query.toDate);

      if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
        return res.render('admin/sales', {
          title: 'Sales Report',
          error: 'Invalid date format provided',
          summaryStats: {},
          salesTableData: { orders: [], pagination: {} },
          currentPage: 1,
          limit: 25,
          fromDate: '',
          toDate: '',
          quickFilter: '',
          reportType: 'monthly'
        });
      }

      if (fromDateObj > toDateObj) {
        return res.render('admin/sales', {
          title: 'Sales Report',
          error: 'End date must be after start date',
          summaryStats: {},
          salesTableData: { orders: [], pagination: {} },
          currentPage: 1,
          limit: 25,
          fromDate: req.query.fromDate,
          toDate: req.query.toDate,
          quickFilter: '',
          reportType: 'custom'
        });
      }
    }
    if (req.query.fromDate && req.query.toDate) {
      startDate = new Date(req.query.fromDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.toDate);
      endDate.setHours(23, 59, 59, 999);
      reportType = 'custom';
    } else if (req.query.quickFilter) {
      const { startDate: qStart, endDate: qEnd } = getQuickFilterDates(req.query.quickFilter);
      startDate = qStart;
      endDate = qEnd;
      reportType = 'custom';
    } else if (req.query.reportType) {
      const { startDate: rStart, endDate: rEnd } = getReportTypeDates(req.query.reportType);
      startDate = rStart;
      endDate = rEnd;
      reportType = req.query.reportType;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      reportType = 'monthly';
    }
    const summaryStats = await calculateSummaryStats(startDate, endDate);
    const salesTableData = await getSalesTableData(startDate, endDate, page, limit);
    return res.render('admin/sales', {
      title: 'Sales Report',
      summaryStats,
      salesTableData,
      currentPage: page,
      limit,
      fromDate: req.query.fromDate || startDate.toISOString().split('T')[0],
      toDate: req.query.toDate || endDate.toISOString().split('T')[0],
      quickFilter: req.query.quickFilter || '',
      reportType: reportType
    });
  } catch (error) {
    return res.render('error', {
      message: 'Failed to load sales data: ' + error.message,
      title: 'Error'
    });
  }
};
const calculateSummaryStats = async (startDate, endDate) => {
  try {
    const allOrders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    });
    const completedOrders = allOrders.filter(order =>
      ['Delivered', 'Shipped', 'Processing'].includes(order.orderStatus)
    );
    const cancelledOrders = allOrders.filter(order =>
      ['Cancelled', 'Partially Cancelled'].includes(order.orderStatus)
    );
    const returnedOrders = allOrders.filter(order =>
      ['Returned', 'Partially Returned'].includes(order.orderStatus)
    );
    const totalOrders = allOrders.length;
    const totalSales = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalDiscounts = completedOrders.reduce((sum, order) => {
      const offerDiscount = order.discount || 0;
      const couponDiscount = order.couponDiscount || 0;
      return sum + offerDiscount + couponDiscount;
    }, 0);
    const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (returnedOrders.length / totalOrders) * 100 : 0;
    return {
      totalSales: formatCurrency(totalSales),
      totalOrders: totalOrders.toLocaleString(),
      completedOrders: completedOrders.length.toLocaleString(),
      cancelledOrders: cancelledOrders.length.toLocaleString(),
      returnedOrders: returnedOrders.length.toLocaleString(),
      totalDiscounts: formatCurrency(totalDiscounts),
      avgOrderValue: formatCurrency(avgOrderValue),
      cancellationRate: cancellationRate.toFixed(1) + '%',
      returnRate: returnRate.toFixed(1) + '%',
      totalSalesRaw: totalSales,
      totalDiscountsRaw: totalDiscounts,
      avgOrderValueRaw: avgOrderValue,
      cancellationRateRaw: cancellationRate,
      returnRateRaw: returnRate
    };
  } catch {
    return {
      totalSales: '₹0',
      totalOrders: '0',
      completedOrders: '0',
      cancelledOrders: '0',
      returnedOrders: '0',
      totalDiscounts: '₹0',
      avgOrderValue: '₹0',
      cancellationRate: '0%',
      returnRate: '0%',
      totalSalesRaw: 0,
      totalDiscountsRaw: 0,
      avgOrderValueRaw: 0,
      cancellationRateRaw: 0,
      returnRateRaw: 0
    };
  }
};
const getQuickFilterDates = (filter) => {
  const now = new Date();
  let startDate, endDate;
  switch (filter) {
  case 'today':
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    break;
  case 'yesterday': {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    break;
  }
  case 'last7days':
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    break;
  case 'last30days':
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    break;
  case 'thismonth':
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    break;
  case 'lastmonth':
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    break;
  case 'thisyear':
    startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    break;
  default:
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { startDate, endDate };
};
const getReportTypeDates = (reportType) => {
  const now = new Date();
  let startDate, endDate;
  switch (reportType) {
  case 'daily':
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    break;
  case 'weekly': {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(now.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 999);
    break;
  }
  case 'monthly':
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    break;
  case 'yearly':
    startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    break;
  default:
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { startDate, endDate };
};

const getSalesTableData = async (startDate, endDate, page, limit) => {
  try {
    const skip = (page - 1) * limit;
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    });
    const formattedOrders = orders.map(order => {
      const grossAmount = (order.total || 0) + (order.discount || 0) + (order.couponDiscount || 0);
      const totalDiscount = (order.discount || 0) + (order.couponDiscount || 0);
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      let statusBadge = '';
      switch (order.orderStatus) {
      case 'Delivered':
        statusBadge = '<span class="badge bg-success">Delivered</span>';
        break;
      case 'Shipped':
        statusBadge = '<span class="badge bg-info">Shipped</span>';
        break;
      case 'Processing':
        statusBadge = '<span class="badge bg-warning text-dark">Processing</span>';
        break;
      case 'Placed':
        statusBadge = '<span class="badge bg-primary">Placed</span>';
        break;
      case 'Cancelled':
        statusBadge = '<span class="badge bg-danger">Cancelled</span>';
        break;
      case 'Partially Cancelled':
        statusBadge = '<span class="badge bg-danger">Partially Cancelled</span>';
        break;
      case 'Returned':
        statusBadge = '<span class="badge bg-secondary">Returned</span>';
        break;
      case 'Partially Returned':
        statusBadge = '<span class="badge bg-secondary">Partially Returned</span>';
        break;
      default:
        statusBadge = '<span class="badge bg-secondary">Unknown</span>';
      }
      return {
        date: order.createdAt.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        orderNumber: order.orderNumber,
        customerName: order.user?.fullName || 'Guest',
        totalItems,
        grossAmount: formatCurrency(grossAmount),
        discount: formatCurrency(totalDiscount),
        couponCode: order.couponCode || '-',
        netAmount: formatCurrency(order.total),
        paymentMethod: order.paymentMethod,
        status: statusBadge,
        grossAmountRaw: grossAmount,
        discountRaw: totalDiscount,
        netAmountRaw: order.total
      };
    });
    const totalPages = Math.ceil(totalOrders / limit);
    const showingStart = totalOrders === 0 ? 0 : skip + 1;
    const showingEnd = Math.min(skip + limit, totalOrders);
    return {
      orders: formattedOrders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        showingStart,
        showingEnd,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      }
    };
  } catch (error) {
    console.error('Error getting sales table data:', error);
    return {
      orders: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalOrders: 0,
        showingStart: 0,
        showingEnd: 0,
        hasNext: false,
        hasPrev: false,
        nextPage: 1,
        prevPage: 1
      }
    };
  }
};
const formatCurrency = (amount) => {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};
const exportToExcel = async (req, res) => {
  try {
    const now = new Date();
    let startDate, endDate;
    if (req.query.fromDate && req.query.toDate) {
      startDate = new Date(req.query.fromDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.toDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (req.query.quickFilter) {
      const { startDate: qStart, endDate: qEnd } = getQuickFilterDates(req.query.quickFilter);
      startDate = qStart;
      endDate = qEnd;
    } else if (req.query.reportType) {
      const { startDate: rStart, endDate: rEnd } = getReportTypeDates(req.query.reportType);
      startDate = rStart;
      endDate = rEnd;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    try {
      // Check date range to prevent excessive data export
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Export range cannot exceed 1 year. Please select a smaller date range.'
        });
      }

      const salesData = await getSalesTableData(startDate, endDate, 1, 10000);
      if (!salesData || !salesData.orders) {
        throw new Error('Failed to get sales data for export');
      }

      if (salesData.orders.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No sales data found for the selected period'
        });
      }
      const excelData = salesData.orders.map(order => ({
        'Date': order.date || 'N/A',
        'Order Number': order.orderNumber || 'N/A',
        'Customer Name': order.customerName || 'Unknown',
        'Total Items': order.totalItems || 0,
        'Gross Amount': typeof order.grossAmountRaw === 'number' ? order.grossAmountRaw.toFixed(2) : '0.00',
        'Discount': typeof order.discountRaw === 'number' ? order.discountRaw.toFixed(2) : '0.00',
        'Coupon Code': order.couponCode || 'N/A',
        'Net Amount': typeof order.netAmountRaw === 'number' ? order.netAmountRaw.toFixed(2) : '0.00',
        'Payment Method': order.paymentMethod || 'N/A',
        'Status': order.status ? order.status.replace(/<[^>]*>/g, '') : 'Unknown'
      }));
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const filename = `sales-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      console.error('Error in Excel processing:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('admin/error', {
        message: 'Failed to export to Excel: ' + error.message
      });
    }
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('admin/error', {
      message: 'Failed to export to Excel: ' + error.message
    });
  }
};
const exportToPDF = async (req, res) => {
  try {
    const now = new Date();
    let startDate, endDate;
    if (req.query.fromDate && req.query.toDate) {
      startDate = new Date(req.query.fromDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.toDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (req.query.quickFilter) {
      const { startDate: qStart, endDate: qEnd } = getQuickFilterDates(req.query.quickFilter);
      startDate = qStart;
      endDate = qEnd;
    } else if (req.query.reportType) {
      const { startDate: rStart, endDate: rEnd } = getReportTypeDates(req.query.reportType);
      startDate = rStart;
      endDate = rEnd;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    try {
      const salesData = await getSalesTableData(startDate, endDate, 1, 10000);
      if (!salesData || !salesData.orders) {
        throw new Error('Failed to get sales data for export');
      }
      const summaryStats = await calculateSummaryStats(startDate, endDate);

      // Check if client wants HTML for print (browser PDF generation)
      if (req.query.format === 'html') {
        const htmlContent = generatePDFHTML(salesData, summaryStats, startDate, endDate);
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
        return;
      }

      // Generate actual PDF using PDFKit
      const PDFDocument = require('pdfkit');
      const filename = `sales-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      // Generate PDF content
      generateSalesReportPDF(doc, salesData, summaryStats, startDate, endDate);

      doc.end();
    } catch (error) {
      console.error('Error in PDF processing:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('admin/error', {
        message: 'Failed to export to PDF: ' + error.message
      });
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('admin/error', {
      message: 'Failed to export to PDF: ' + error.message
    });
  }
};
const generatePDFHTML = (salesData, summaryStats, startDate, endDate) => {
  const formatDate = (date) => date.toLocaleDateString('en-IN');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #4361EE;
          padding-bottom: 20px;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }
        .summary-item { text-align: center; }
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #4361EE;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #4361EE;
          color: white;
          font-weight: bold;
        }
        .status-delivered { color: #28a745; }
        .status-shipped { color: #17a2b8; }
        .status-processing { color: #ffc107; }
        .status-placed { color: #6f42c1; }
        .print-instructions {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #4361EE;
          color: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 1000;
          max-width: 300px;
        }
        .print-btn {
          background: white;
          color: #4361EE;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
          font-weight: bold;
        }
        @media print {
          .print-instructions { display: none; }
          body { margin: 0; }
          .header { border-bottom: 2px solid #000; }
          th { background-color: #000 !important; color: white !important; }
        }
      </style>
    </head>
    <body>
      <div class="print-instructions">
        <strong>📄 PDF Export Instructions</strong>
        <p>To save as PDF:</p>
        <ol>
          <li>Click "Print to PDF" below</li>
          <li>Or press Ctrl+P (Cmd+P on Mac)</li>
          <li>Select "Save as PDF" as destination</li>
          <li>Click Save</li>
        </ol>
        <button class="print-btn" onclick="window.print()">🖨️ Print to PDF</button>
        <button class="print-btn" onclick="window.close()" style="margin-left: 5px;">✖️ Close</button>
      </div>
      <div class="header">
        <h1>Sales Report</h1>
        <p>Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
        <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
      </div>
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${summaryStats.totalSales}</div>
          <div>Total Sales</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summaryStats.totalOrders}</div>
          <div>Total Orders</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summaryStats.totalDiscounts}</div>
          <div>Total Discounts</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summaryStats.avgOrderValue}</div>
          <div>Avg Order Value</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Order Number</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Gross Amount</th>
            <th>Discount</th>
            <th>Coupon</th>
            <th>Net Amount</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${salesData.orders.map(order => `
            <tr>
              <td>${order.date}</td>
              <td>${order.orderNumber}</td>
              <td>${order.customerName}</td>
              <td>${order.totalItems}</td>
              <td>${order.grossAmount}</td>
              <td>${order.discount}</td>
              <td>${order.couponCode}</td>
              <td>${order.netAmount}</td>
              <td>${order.paymentMethod}</td>
              <td>${order.status.replace(/<[^>]*>/g, '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 30px; text-align: center; color: #666;">
        <p>Total Records: ${salesData.orders.length}</p>
        <p>Report generated by Phoenix Admin Dashboard</p>
      </div>
    </body>
    </html>
  `;
};

const generateSalesReportPDF = (doc, salesData, summaryStats, startDate, endDate) => {
  const colors = {
    primary: '#4361EE',
    secondary: '#6B7280',
    dark: '#111827',
    light: '#F8FAFC'
  };

  // Header
  doc.fontSize(24).fillColor(colors.primary).text('Sales Report', 50, 50);
  doc.fontSize(12).fillColor(colors.secondary)
     .text(`Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, 50, 80)
     .text(`Generated on: ${new Date().toLocaleString()}`, 50, 95);

  // Summary Stats
  let yPos = 130;
  doc.fontSize(16).fillColor(colors.dark).text('Summary Statistics', 50, yPos);
  yPos += 30;

  const stats = [
    ['Total Sales', summaryStats.totalSales],
    ['Total Orders', summaryStats.totalOrders],
    ['Completed Orders', summaryStats.completedOrders],
    ['Cancelled Orders', summaryStats.cancelledOrders]
  ];

  stats.forEach((stat, index) => {
    const xPos = 50 + (index % 2) * 250;
    if (index % 2 === 0 && index > 0) yPos += 25;

    doc.fontSize(10).fillColor(colors.secondary).text(stat[0], xPos, yPos);
    doc.fontSize(14).fillColor(colors.primary).text(stat[1].toString(), xPos, yPos + 12);
  });

  // Orders Table
  yPos += 60;
  doc.fontSize(16).fillColor(colors.dark).text('Order Details', 50, yPos);
  yPos += 30;

  // Table headers
  const headers = ['Date', 'Order #', 'Customer', 'Amount', 'Status'];
  const colWidths = [80, 100, 120, 80, 80];
  let xPos = 50;

  doc.fontSize(10).fillColor(colors.dark);
  headers.forEach((header, index) => {
    doc.text(header, xPos, yPos, { width: colWidths[index], align: 'left' });
    xPos += colWidths[index];
  });

  // Draw header line
  yPos += 15;
  doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
  yPos += 10;

  // Table rows
  doc.fontSize(9).fillColor(colors.secondary);
  salesData.orders.slice(0, 30).forEach((order, index) => { // Limit to 30 orders for PDF
    if (yPos > 700) { // New page if needed
      doc.addPage();
      yPos = 50;
    }

    xPos = 50;
    const rowData = [
      order.date,
      order.orderNumber,
      order.customerName.substring(0, 15) + (order.customerName.length > 15 ? '...' : ''),
      order.netAmount,
      order.status.replace(/<[^>]*>/g, '').substring(0, 10)
    ];

    rowData.forEach((data, colIndex) => {
      doc.text(data.toString(), xPos, yPos, { width: colWidths[colIndex], align: 'left' });
      xPos += colWidths[colIndex];
    });

    yPos += 20;
  });

  // Footer
  if (salesData.orders.length > 30) {
    yPos += 20;
    doc.fontSize(10).fillColor(colors.secondary)
       .text(`Showing first 30 orders of ${salesData.orders.length} total orders`, 50, yPos);
  }

  yPos += 30;
  doc.fontSize(8).fillColor(colors.secondary)
     .text('Generated by Phoenix Admin Dashboard', 50, yPos);
};

module.exports = {
  getSales,
  exportToExcel,
  exportToPDF
};