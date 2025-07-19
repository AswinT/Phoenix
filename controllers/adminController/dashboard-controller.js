const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const { HttpStatus } = require('../../helpers/status-code');

const getDashboard = async (req, res) => {
  try {
    // Calculate dashboard statistics
    const dashboardStats = await calculateDashboardStats();

    res.render('adminDashboard', {
      admin: res.locals.admin,
      dashboardStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to load Dashboard',
    });
  }
};

// Helper function to calculate dashboard statistics
const calculateDashboardStats = async () => {
  try {
    const now = new Date();

    // Current month (this month)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Previous month
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 1. Total Users (exclude admin users) - show total but compare monthly growth
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

    // 2. Total Orders - show total but compare monthly growth
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

    // 3. Total Sales (from successful orders) - show total but compare monthly growth
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

    // 4. Pending Orders - show current total but compare monthly growth
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
      }
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return {
      totalUsers: { value: '0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      totalOrders: { value: '0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      totalSales: { value: '₹0', growth: { percentage: 0, isPositive: true }, rawValue: 0 },
      pendingOrders: { value: '0', growth: { percentage: 0, isPositive: true }, rawValue: 0 }
    };
  }
};

// Helper function to calculate growth percentage
const calculateGrowthPercentage = (current, previous) => {
  // Handle edge cases
  if (previous === 0) {
    if (current === 0) {
      return { percentage: 0, isPositive: true };
    }
    // If previous was 0 and current > 0, it's infinite growth, show as 100%
    return { percentage: 100, isPositive: true };
  }

  if (current === 0 && previous > 0) {
    // Complete decline from previous value
    return { percentage: 100, isPositive: false };
  }

  // Calculate percentage change: ((current - previous) / previous) * 100
  const percentageChange = ((current - previous) / previous) * 100;
  const isPositive = percentageChange >= 0;
  const percentage = Math.abs(percentageChange);

  return {
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
    isPositive
  };
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

module.exports = {
  getDashboard
};