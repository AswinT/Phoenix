const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const { HttpStatus } = require('../../helpers/statusCode');
const getDashboard = async (req, res) => {
  try {
    const dashboardStats = await calculateDashboardStats();
    res.render('adminDashboard', {
      admin: res.locals.admin,
      dashboardStats
    });
  } catch {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to load Dashboard',
    });
  }
};
const calculateDashboardStats = async () => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisWeekStart = new Date(now.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekEnd = new Date(thisWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    thisWeekEnd.setHours(23, 59, 59, 999);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(thisWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const currentMonthUsers = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    const previousMonthUsers = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
    });
    const usersGrowth = calculateGrowthPercentage(currentMonthUsers, previousMonthUsers);
    const totalOrders = await Order.countDocuments({ isDeleted: false });
    const currentMonthOrders = await Order.countDocuments({
      isDeleted: false,
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    const previousMonthOrders = await Order.countDocuments({
      isDeleted: false,
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
    });
    const ordersGrowth = calculateGrowthPercentage(currentMonthOrders, previousMonthOrders);
    const salesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false
    });
    const totalSales = salesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const currentMonthSalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    const currentMonthSales = currentMonthSalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const previousMonthSalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
    });
    const previousMonthSales = previousMonthSalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const salesGrowth = calculateGrowthPercentage(currentMonthSales, previousMonthSales);
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['Placed', 'Processing'] },
      isDeleted: false
    });
    const currentMonthPendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['Placed', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    const previousMonthPendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['Placed', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
    });
    const pendingGrowth = calculateGrowthPercentage(currentMonthPendingOrders, previousMonthPendingOrders);
    const todaySalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    const todaySales = todaySalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const yesterdaySalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });
    const yesterdaySales = yesterdaySalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const todayGrowth = calculateGrowthPercentage(todaySales, yesterdaySales);
    const thisWeekSalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }
    });
    const weekSales = thisWeekSalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const lastWeekSalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
    });
    const lastWeekSales = lastWeekSalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const weekGrowth = calculateGrowthPercentage(weekSales, lastWeekSales);
    const monthSales = currentMonthSales;
    const monthGrowth = salesGrowth;
    const avgOrderValue = currentMonthSalesOrders.length > 0 ? currentMonthSales / currentMonthSalesOrders.length : 0;
    const previousAvgOrderValue = previousMonthSalesOrders.length > 0 ? previousMonthSales / previousMonthSalesOrders.length : 0;
    const avgOrderValueGrowth = calculateGrowthPercentage(avgOrderValue, previousAvgOrderValue);
    const topCategory = await calculateTopCategory();
    const totalVisitors = totalUsers;
    const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const currentYearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    const currentYearSalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: currentYearStart, $lte: currentYearEnd }
    });
    const currentYearSales = currentYearSalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const previousYearSalesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: previousYearStart, $lte: previousYearEnd }
    });
    const previousYearSales = previousYearSalesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenueGrowth = calculateGrowthPercentage(currentYearSales, previousYearSales);
    const paymentMethods = await calculatePaymentMethods();
    const regions = await calculateRegionalSales();
    return {
      totalUsers: {
        value: totalUsers.toLocaleString('en-IN'),
        growth: usersGrowth,
        rawValue: totalUsers
      },
      totalOrders: {
        value: totalOrders.toLocaleString('en-IN'),
        growth: ordersGrowth,
        rawValue: totalOrders
      },
      totalSales: {
        value: formatCurrency(totalSales),
        growth: salesGrowth,
        rawValue: totalSales
      },
      pendingOrders: {
        value: pendingOrders.toLocaleString('en-IN'),
        growth: pendingGrowth,
        rawValue: pendingOrders
      },
      todaySales: Math.round(todaySales).toLocaleString('en-IN'),
      todayGrowth: todayGrowth,
      weekSales: Math.round(weekSales).toLocaleString('en-IN'),
      weekGrowth: weekGrowth,
      monthSales: Math.round(monthSales).toLocaleString('en-IN'),
      monthGrowth: monthGrowth,
      avgOrderValue: Math.round(avgOrderValue).toLocaleString('en-IN'),
      avgOrderValueGrowth: avgOrderValueGrowth,
      topCategory: topCategory,
      conversionRate: conversionRate.toFixed(1),
      totalVisitors: totalVisitors.toLocaleString('en-IN'),
      revenueGrowth: revenueGrowth.percentage.toFixed(1),
      paymentMethods: paymentMethods,
      regions: regions
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return {
      totalUsers: { value: '0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      totalOrders: { value: '0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      totalSales: { value: '₹0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      pendingOrders: { value: '0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      todaySales: '0',
      weekSales: '0',
      monthSales: '0',
      avgOrderValue: '0',
      conversionRate: '0.0',
      revenueGrowth: '0.0'
    };
  }
};
const calculateGrowthPercentage = (current, previous) => {
  if (previous === 0) {
    if (current === 0) {
      return { percentage: 0, isPositive: true };
    }
    return { percentage: 100, isPositive: true };
  }
  if (current === 0 && previous > 0) {
    return { percentage: 100, isPositive: false };
  }
  const percentageChange = ((current - previous) / previous) * 100;
  const isPositive = percentageChange >= 0;
  const percentage = Math.abs(percentageChange);
  return {
    percentage: Math.round(percentage * 10) / 10,
    isPositive
  };
};
const calculateTopCategory = async () => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false
    }).populate({
      path: 'items.product',
      populate: {
        path: 'category',
        model: 'Category'
      }
    });
    const categorySales = {};
    let totalSales = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.product && item.product.category && item.product.category.name) {
          const categoryName = item.product.category.name;
          const itemTotal = item.price * item.quantity;
          if (!categorySales[categoryName]) {
            categorySales[categoryName] = 0;
          }
          categorySales[categoryName] += itemTotal;
          totalSales += itemTotal;
        }
      });
    });
    let topCategoryName = 'Electronics';
    let topCategorySales = 0;
    Object.entries(categorySales).forEach(([category, sales]) => {
      if (sales > topCategorySales) {
        topCategoryName = category;
        topCategorySales = sales;
      }
    });
    const percentage = totalSales > 0 ? Math.round((topCategorySales / totalSales) * 100) : 0;
    return {
      name: topCategoryName,
      sales: Math.round(topCategorySales).toLocaleString('en-IN'),
      percentage: percentage
    };
  } catch (error) {
    console.error('Error calculating top category:', error);
    return {
      name: 'Electronics',
      sales: '0',
      percentage: 0
    };
  }
};
const calculatePaymentMethods = async () => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false
    });
    const paymentCounts = {
      'Credit/Debit Cards': 0,
      'UPI/Digital Wallets': 0,
      'Cash on Delivery': 0
    };
    orders.forEach(order => {
      const method = order.paymentMethod;
      if (method === 'razorpay' || method === 'card') {
        paymentCounts['Credit/Debit Cards']++;
      } else if (method === 'upi' || method === 'wallet') {
        paymentCounts['UPI/Digital Wallets']++;
      } else if (method === 'cod' || method === 'cash') {
        paymentCounts['Cash on Delivery']++;
      } else {
        paymentCounts['Credit/Debit Cards']++;
      }
    });
    const totalOrders = orders.length;
    return {
      cards: totalOrders > 0 ? Math.round((paymentCounts['Credit/Debit Cards'] / totalOrders) * 100) : 65,
      upi: totalOrders > 0 ? Math.round((paymentCounts['UPI/Digital Wallets'] / totalOrders) * 100) : 25,
      cod: totalOrders > 0 ? Math.round((paymentCounts['Cash on Delivery'] / totalOrders) * 100) : 10
    };
  } catch (error) {
    console.error('Error calculating payment methods:', error);
    return {
      cards: 65,
      upi: 25,
      cod: 10
    };
  }
};
const calculateRegionalSales = async () => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false
    });
    const regionSales = {};
    orders.forEach(order => {
      if (order.address && order.address.city) {
        const city = order.address.city.toLowerCase();
        const orderTotal = order.total || 0;
        let region = 'Others';
        if (city.includes('mumbai') || city.includes('bombay')) {
          region = 'Mumbai';
        } else if (city.includes('delhi') || city.includes('new delhi')) {
          region = 'Delhi';
        } else if (city.includes('bangalore') || city.includes('bengaluru')) {
          region = 'Bangalore';
        } else if (city.includes('chennai') || city.includes('madras')) {
          region = 'Chennai';
        }
        if (!regionSales[region]) {
          regionSales[region] = 0;
        }
        regionSales[region] += orderTotal;
      }
    });
    const getGrowthForRegion = (region) => {
      const growthRates = {
        'Mumbai': 12,
        'Delhi': 8,
        'Bangalore': 15,
        'Chennai': -3,
        'Others': 5
      };
      return growthRates[region] || 0;
    };
    return {
      mumbai: Math.round(regionSales['Mumbai'] || 0).toLocaleString('en-IN'),
      delhi: Math.round(regionSales['Delhi'] || 0).toLocaleString('en-IN'),
      bangalore: Math.round(regionSales['Bangalore'] || 0).toLocaleString('en-IN'),
      chennai: Math.round(regionSales['Chennai'] || 0).toLocaleString('en-IN'),
      mumbaiGrowth: getGrowthForRegion('Mumbai'),
      delhiGrowth: getGrowthForRegion('Delhi'),
      bangaloreGrowth: getGrowthForRegion('Bangalore'),
      chennaiGrowth: getGrowthForRegion('Chennai')
    };
  } catch (error) {
    console.error('Error calculating regional sales:', error);
    return {
      mumbai: '0',
      delhi: '0',
      bangalore: '0',
      chennai: '0',
      mumbaiGrowth: 0,
      delhiGrowth: 0,
      bangaloreGrowth: 0,
      chennaiGrowth: 0
    };
  }
};
const formatCurrency = (amount) => {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

// Calculate analytics data for charts
const calculateAnalyticsData = async (period, year) => {
  try {
    let periods, startDate, endDate;

    switch (period) {
    case 'yearly':
      // Last 5 years
      periods = Array.from({ length: 5 }, (_, i) => year - 4 + i);
      startDate = new Date(year - 4, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      break;
    case 'monthly':
      // 12 months of the year
      periods = Array.from({ length: 12 }, (_, i) => i + 1);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      break;
    case 'weekly':
      // 52 weeks of the year
      periods = Array.from({ length: 52 }, (_, i) => i + 1);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      break;
    case 'daily': {
      // Last 30 days from current date (ignore year parameter)
      const today = new Date();
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      periods = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      });
      break;
    }
    default:
      periods = Array.from({ length: 12 }, (_, i) => i + 1);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const salesData = await calculateSalesDataByPeriod(period, startDate, endDate);
    const revenueData = await calculateRevenueDataByPeriod(period, startDate, endDate);
    const orderData = await calculateOrderDataByPeriod(period, startDate, endDate);

    return {
      period,
      year: period === 'daily' ? 'Last 30 days' : year,
      labels: periods,
      salesData,
      revenueData,
      orderData
    };
  } catch (error) {
    console.error('Error calculating analytics data:', error);
    throw error;
  }
};

// Calculate sales data by period
const calculateSalesDataByPeriod = async (period, startDate, endDate) => {
  try {
    const pipeline = [];

    // Match orders within the specified period
    pipeline.push({
      $match: {
        orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
        isDeleted: false,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    });

    // Group by period
    let groupId;
    switch (period) {
    case 'yearly':
      groupId = { $year: '$createdAt' };
      break;
    case 'monthly':
      groupId = { $month: '$createdAt' };
      break;
    case 'weekly':
      groupId = { $week: '$createdAt' };
      break;
    case 'daily':
      // For daily, group by date string (YYYY-MM-DD)
      groupId = {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt'
        }
      };
      break;
    default:
      groupId = { $month: '$createdAt' };
    }

    pipeline.push({
      $group: {
        _id: groupId,
        totalSales: { $sum: '$total' },
        orderCount: { $sum: 1 }
      }
    });

    pipeline.push({ $sort: { _id: 1 } });

    const results = await Order.aggregate(pipeline);

    // Fill in missing periods with 0
    const dataMap = new Map();
    results.forEach(result => {
      dataMap.set(result._id, result.totalSales);
    });

    // Generate expected periods based on the date range
    const expectedPeriods = [];
    if (period === 'yearly') {
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      for (let year = startYear; year <= endYear; year++) {
        expectedPeriods.push(year);
      }
    } else if (period === 'monthly') {
      for (let month = 1; month <= 12; month++) {
        expectedPeriods.push(month);
      }
    } else if (period === 'weekly') {
      for (let week = 1; week <= 52; week++) {
        expectedPeriods.push(week);
      }
    } else if (period === 'daily') {
      // Generate all dates in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        expectedPeriods.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return expectedPeriods.map(period => dataMap.get(period) || 0);
  } catch (error) {
    console.error('Error calculating sales data by period:', error);
    throw error;
  }
};
// Calculate revenue data by period (similar to sales but focused on profit)
const calculateRevenueDataByPeriod = async (period, startDate, endDate) => {
  // For now, revenue = sales (can be enhanced to calculate actual profit)
  return await calculateSalesDataByPeriod(period, startDate, endDate);
};

// Calculate order count data by period
const calculateOrderDataByPeriod = async (period, startDate, endDate) => {
  try {
    const pipeline = [];

    pipeline.push({
      $match: {
        isDeleted: false,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    });

    let groupId;
    switch (period) {
    case 'yearly':
      groupId = { $year: '$createdAt' };
      break;
    case 'monthly':
      groupId = { $month: '$createdAt' };
      break;
    case 'weekly':
      groupId = { $week: '$createdAt' };
      break;
    case 'daily':
      // For daily, group by date string (YYYY-MM-DD)
      groupId = {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt'
        }
      };
      break;
    default:
      groupId = { $month: '$createdAt' };
    }

    pipeline.push({
      $group: {
        _id: groupId,
        orderCount: { $sum: 1 }
      }
    });

    pipeline.push({ $sort: { _id: 1 } });

    const results = await Order.aggregate(pipeline);

    const dataMap = new Map();
    results.forEach(result => {
      dataMap.set(result._id, result.orderCount);
    });

    // Generate expected periods based on the date range
    const expectedPeriods = [];
    if (period === 'yearly') {
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      for (let year = startYear; year <= endYear; year++) {
        expectedPeriods.push(year);
      }
    } else if (period === 'monthly') {
      for (let month = 1; month <= 12; month++) {
        expectedPeriods.push(month);
      }
    } else if (period === 'weekly') {
      for (let week = 1; week <= 52; week++) {
        expectedPeriods.push(week);
      }
    } else if (period === 'daily') {
      // Generate all dates in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        expectedPeriods.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return expectedPeriods.map(period => dataMap.get(period) || 0);
  } catch (error) {
    console.error('Error calculating order data by period:', error);
    throw error;
  }
};

// Calculate top performance data with filter support
const calculateTopPerformance = async (period = 'monthly', year = new Date().getFullYear()) => {
  let startDate, endDate;

  if (period === 'yearly') {
    startDate = new Date(year - 4, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  } else if (period === 'monthly') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  } else if (period === 'weekly') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  } else if (period === 'daily') {
    const today = new Date();
    startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  }

  const [topProducts, topCategories, topBrands] = await Promise.all([
    calculateTopProductsForPeriod(startDate, endDate),
    calculateTopCategoriesForPeriod(startDate, endDate),
    calculateTopBrandsForPeriod(startDate, endDate)
  ]);

  return {
    topProducts,
    topCategories,
    topBrands
  };
};









const getAnalyticsData = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    const analyticsData = await calculateAnalyticsData(period, parseInt(year));

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Analytics data error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
};

// Get top performance data with filter support
const getTopPerformance = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    const topPerformanceData = await calculateTopPerformance(period, parseInt(year));

    res.json({
      success: true,
      data: topPerformanceData
    });
  } catch {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch top performance data'
    });
  }
};









// Ledger book generation functions removed

// Helper function to calculate top products for a specific period
const calculateTopProductsForPeriod = async (startDate, endDate) => {
  try {
    const pipeline = [
      {
        $match: {
          orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isDeleted: false,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'Active'
        }
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $multiply: [
                '$items.quantity',
                {
                  $ifNull: [
                    '$items.priceBreakdown.finalPrice',
                    '$items.discountedPrice'
                  ]
                }
              ]
            }
          },
          productName: { $first: '$items.model' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      }
    ];

    const results = await Order.aggregate(pipeline);
    const totalSales = results.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const totalRevenue = results.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);

    return results.map((item, index) => ({
      rank: index + 1,
      productId: item._id,
      name: item.productName || item.productDetails[0]?.name || 'Unknown Product',
      image: item.productDetails[0]?.images?.[0] || '/images/default-product.jpg',
      quantitySold: item.totalQuantity || 0,
      revenue: item.totalRevenue || 0,
      brand: item.productDetails[0]?.brand || 'Unknown Brand',
      salesPercentage: totalSales > 0 ? ((item.totalQuantity || 0) / totalSales * 100).toFixed(1) : 0,
      revenuePercentage: totalRevenue > 0 ? ((item.totalRevenue || 0) / totalRevenue * 100).toFixed(1) : 0
    }));
  } catch {
    return [];
  }
};

// Helper function to calculate top categories for a specific period
const calculateTopCategoriesForPeriod = async (startDate, endDate) => {
  try {
    const pipeline = [
      {
        $match: {
          orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isDeleted: false,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'Active'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $group: {
          _id: '$categoryDetails._id',
          categoryName: { $first: '$categoryDetails.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $multiply: [
                '$items.quantity',
                {
                  $ifNull: [
                    '$items.priceBreakdown.finalPrice',
                    '$items.discountedPrice'
                  ]
                }
              ]
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ];

    const results = await Order.aggregate(pipeline);
    const totalSales = results.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const totalRevenue = results.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);

    return results.map((item, index) => ({
      rank: index + 1,
      categoryId: item._id,
      name: item.categoryName || 'Unknown Category',
      quantitySold: item.totalQuantity || 0,
      revenue: item.totalRevenue || 0,
      salesPercentage: totalSales > 0 ? ((item.totalQuantity || 0) / totalSales * 100).toFixed(1) : 0,
      revenuePercentage: totalRevenue > 0 ? ((item.totalRevenue || 0) / totalRevenue * 100).toFixed(1) : 0
    }));
  } catch (error) {
    console.error('Error calculating top categories for period:', error);
    return [];
  }
};

// Helper function to calculate top brands for a specific period
const calculateTopBrandsForPeriod = async (startDate, endDate) => {
  try {
    const pipeline = [
      {
        $match: {
          orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isDeleted: false,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'Active'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.brand',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $multiply: [
                '$items.quantity',
                {
                  $ifNull: [
                    '$items.priceBreakdown.finalPrice',
                    '$items.discountedPrice'
                  ]
                }
              ]
            }
          },
          productCount: { $addToSet: '$items.product' }
        }
      },
      {
        $addFields: {
          uniqueProductCount: { $size: '$productCount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ];

    const results = await Order.aggregate(pipeline);
    const totalSales = results.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const totalRevenue = results.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);

    return results.map((item, index) => ({
      rank: index + 1,
      name: item._id || 'Unknown Brand',
      quantitySold: item.totalQuantity || 0,
      revenue: item.totalRevenue || 0,
      productCount: item.uniqueProductCount || 0,
      salesPercentage: totalSales > 0 ? ((item.totalQuantity || 0) / totalSales * 100).toFixed(1) : 0,
      revenuePercentage: totalRevenue > 0 ? ((item.totalRevenue || 0) / totalRevenue * 100).toFixed(1) : 0
    }));
  } catch (error) {
    console.error('Error calculating top brands for period:', error);
    return [];
  }
};



// PDF content generation function removed

// Excel content generation function removed

// Ledger book data generation function removed

module.exports = {
  getDashboard,
  getAnalyticsData,
  getTopPerformance
};