const Order = require('../../models/orderSchema');
const XLSX = require('xlsx');
const { HttpStatus } = require('../../helpers/status-code');

const getSales = async (req, res) => {
  try {
    // Get date range from query parameters or default to current month
    const now = new Date();
    let startDate, endDate;

    // Determine the report type
    let reportType = req.query.reportType || 'monthly';
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;

    // Check if custom date range is provided
    if (req.query.fromDate && req.query.toDate) {
      startDate = new Date(req.query.fromDate);
      // Ensure start date is set to beginning of day
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(req.query.toDate);
      // Ensure end date is set to end of day
      endDate.setHours(23, 59, 59, 999);
      
      reportType = 'custom';
    } else if (req.query.quickFilter) {
      // Handle quick filter options
      const { startDate: qStart, endDate: qEnd } = getQuickFilterDates(req.query.quickFilter);
      startDate = qStart;
      endDate = qEnd;
      reportType = 'custom'; // Quick filters are essentially custom ranges
    } else if (req.query.reportType) {
      // Handle predefined report types
      const { startDate: rStart, endDate: rEnd } = getReportTypeDates(req.query.reportType);
      startDate = rStart;
      endDate = rEnd;
      reportType = req.query.reportType;
    } else {
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      reportType = 'monthly';
    }

    // Calculate summary stats for selected date range
    const summaryStats = await calculateSummaryStats(startDate, endDate);

    // Get detailed sales data with pagination
    const salesTableData = await getSalesTableData(startDate, endDate, page, limit);

    return res.render('admin/sales', {
      title: 'Sales Report',
      summaryStats,
      salesTableData,
      currentPage: page,
      limit,
      // Pass current filter values to maintain state
      fromDate: req.query.fromDate || startDate.toISOString().split('T')[0],
      toDate: req.query.toDate || endDate.toISOString().split('T')[0],
      quickFilter: req.query.quickFilter || '',
      reportType: reportType
    });
  } catch (error) {
    console.error('Error in getSales:', error);
    
    return res.render('error', { 
      message: 'Failed to load sales data: ' + error.message,
      title: 'Error'
    });
  }
};

// Helper function to calculate summary statistics
const calculateSummaryStats = async (startDate, endDate) => {
  try {
    // Get all orders in the date range
    const allOrders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    });
    
    // Categorize orders by status
    const completedOrders = allOrders.filter(order => 
      ['Delivered', 'Shipped', 'Processing'].includes(order.orderStatus)
    );
    
    const cancelledOrders = allOrders.filter(order => 
      ['Cancelled', 'Partially Cancelled'].includes(order.orderStatus)
    );
    
    const returnedOrders = allOrders.filter(order => 
      ['Returned', 'Partially Returned'].includes(order.orderStatus)
    );
    
    // Calculate totals (only count completed orders for sales)
    const totalOrders = allOrders.length;
    const totalSales = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calculate discounts (offer + coupon)
    const totalDiscounts = completedOrders.reduce((sum, order) => {
      const offerDiscount = order.discount || 0;
      const couponDiscount = order.couponDiscount || 0;
      return sum + offerDiscount + couponDiscount;
    }, 0);

    // Calculate average order value (for completed orders only)
    const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

    // Calculate cancellation rate
    const cancellationRate = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;
    
    // Calculate return rate
    const returnRate = totalOrders > 0 ? (returnedOrders.length / totalOrders) * 100 : 0;

    // Format numbers for display
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
      // Raw values for calculations
      totalSalesRaw: totalSales,
      totalDiscountsRaw: totalDiscounts,
      avgOrderValueRaw: avgOrderValue,
      cancellationRateRaw: cancellationRate,
      returnRateRaw: returnRate
    };
  } catch (error) {
    console.error('Error calculating summary stats:', error);
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

// Helper function to get quick filter date ranges
const getQuickFilterDates = (filter) => {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      break;
    case 'last7days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6); // Include today (-6 gives 7 days total)
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'last30days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29); // Include today (-29 gives 30 days total)
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
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

// Helper function to get report type dates
const getReportTypeDates = (reportType) => {
  const now = new Date();
  let startDate, endDate;

  switch (reportType) {
    case 'daily':
      // Today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'weekly':
      // This week (Monday to Sunday)
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
      startDate = new Date(now.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      // This month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      // This year
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

// Helper function to calculate sales trend for chart (DISABLED - chart removed from frontend)
// Keeping this function for potential future use
const calculateSalesTrend = async (startDate, endDate) => {
  try {
    // Get all weeks in the selected date range
    const labels = [];
    const grossSales = [];
    const netSales = [];
    const discounts = [];

    // Calculate the number of weeks in the date range
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.max(1, Math.ceil(diffDays / 7));

    // Calculate week ranges for selected date range
    for (let week = 0; week < totalWeeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (week * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Ensure we don't go beyond the selected end date
      if (weekStart > endDate) break;
      if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

      // Get orders for this week
      const weekOrders = await Order.find({
        createdAt: { $gte: weekStart, $lte: weekEnd },
        orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
        isDeleted: false
      });

      // Calculate week totals
      const weekGrossSales = weekOrders.reduce((sum, order) => {
        const gross = (order.total || 0) + (order.discount || 0) + (order.couponDiscount || 0);
        return sum + gross;
      }, 0);

      const weekNetSales = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      const weekDiscounts = weekOrders.reduce((sum, order) => {
        return sum + (order.discount || 0) + (order.couponDiscount || 0);
      }, 0);

      labels.push(`Week ${week + 1}`);
      grossSales.push(Math.round(weekGrossSales));
      netSales.push(Math.round(weekNetSales));
      discounts.push(Math.round(weekDiscounts));
    }

    // Ensure we have at least the weeks that exist in the month
    // No need to pad to 4 weeks - show actual weeks in month

    return {
      labels,
      grossSales,
      netSales,
      discounts
    };
  } catch (error) {
    console.error('Error calculating sales trend:', error);
    return {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
      grossSales: [0, 0, 0, 0, 0],
      netSales: [0, 0, 0, 0, 0],
      discounts: [0, 0, 0, 0, 0]
    };
  }
};

// Helper function to get sales table data with pagination
const getSalesTableData = async (startDate, endDate, page, limit) => {
  try {
    const skip = (page - 1) * limit;

    // Get orders with pagination
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    })
    .populate('user', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false
    });

    // Format orders for table display
    const formattedOrders = orders.map(order => {
      // Calculate gross amount (total + discounts)
      const grossAmount = (order.total || 0) + (order.discount || 0) + (order.couponDiscount || 0);
      const totalDiscount = (order.discount || 0) + (order.couponDiscount || 0);

      // Count total items
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

      // Format status
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
        // Raw values for calculations
        grossAmountRaw: grossAmount,
        discountRaw: totalDiscount,
        netAmountRaw: order.total
      };
    });

    // Calculate pagination info
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

// Helper function to format currency
const formatCurrency = (amount) => {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

// Export to Excel function
const exportToExcel = async (req, res) => {
  try {
    // Get the same date range logic as getSales
    const now = new Date();
    let startDate, endDate;

    // Determine the report type
    let reportType = req.query.reportType || 'monthly';

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
      reportType = 'custom'; // Quick filters are essentially custom ranges
    } else if (req.query.reportType) {
      const { startDate: rStart, endDate: rEnd } = getReportTypeDates(req.query.reportType);
      startDate = rStart;
      endDate = rEnd;
      reportType = req.query.reportType;
    } else {
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      reportType = 'monthly';
    }

    try {
      // Get all sales data (no pagination for export)
      const salesData = await getSalesTableData(startDate, endDate, 1, 10000);
      
      if (!salesData || !salesData.orders) {
        throw new Error('Failed to get sales data for export');
      }

      // Prepare data for Excel
      const excelData = salesData.orders.map(order => ({
        'Date': order.date,
        'Order Number': order.orderNumber,
        'Customer Name': order.customerName,
        'Total Items': order.totalItems,
        'Gross Amount': order.grossAmountRaw,
        'Discount': order.discountRaw,
        'Coupon Code': order.couponCode,
        'Net Amount': order.netAmountRaw,
        'Payment Method': order.paymentMethod,
        'Status': order.status.replace(/<[^>]*>/g, '') // Remove HTML tags
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers
      const filename = `sales-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Send the file
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

// Export to PDF function
const exportToPDF = async (req, res) => {
  try {
    // Get the same date range logic as getSales
    const now = new Date();
    let startDate, endDate;

    // Determine the report type
    let reportType = req.query.reportType || 'monthly';

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
      reportType = 'custom'; // Quick filters are essentially custom ranges
    } else if (req.query.reportType) {
      const { startDate: rStart, endDate: rEnd } = getReportTypeDates(req.query.reportType);
      startDate = rStart;
      endDate = rEnd;
      reportType = req.query.reportType;
    } else {
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      reportType = 'monthly';
    }

    try {
      // Get all sales data for PDF
      const salesData = await getSalesTableData(startDate, endDate, 1, 10000);
      
      if (!salesData || !salesData.orders) {
        throw new Error('Failed to get sales data for export');
      }

      // Calculate summary stats for the date range
      const summaryStats = await calculateSummaryStats(startDate, endDate);

      // Generate HTML for PDF
      const htmlContent = generatePDFHTML(salesData, summaryStats, startDate, endDate);

      // Set response headers for inline display
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
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

// Helper function to generate HTML for PDF
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

module.exports = {
  getSales,
  exportToExcel,
  exportToPDF
};