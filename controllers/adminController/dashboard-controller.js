const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const { HttpStatus } = require('../../helpers/status-code');

const getDashboard = async (req, res) => {
  try {
    // Calculate comprehensive dashboard data
    const [
      dashboardStats,
      recentOrders,
      orderAnalytics,
      productAnalytics,
      userAnalytics,
      financialAnalytics,
      systemNotifications,
      chartData
    ] = await Promise.all([
      calculateDashboardStats(),
      getRecentOrders(),
      getOrderAnalytics(),
      getProductAnalytics(),
      getUserAnalytics(),
      getFinancialAnalytics(),
      getSystemNotifications(),
      getChartData()
    ]);

    res.render('adminDashboard', {
      admin: res.locals.admin,
      dashboardStats,
      recentOrders,
      orderAnalytics,
      productAnalytics,
      userAnalytics,
      financialAnalytics,
      systemNotifications,
      chartData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to load Dashboard',
    });
  }
};

// Helper function to calculate basic dashboard statistics
const calculateDashboardStats = async () => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Total Users (exclude admin users)
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const newUsersToday = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: startOfToday }
    });

    // 2. Total Orders
    const totalOrders = await Order.countDocuments({ isDeleted: false });
    const ordersToday = await Order.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startOfToday }
    });

    // 3. Total Sales (from successful orders)
    const salesOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false
    });
    const totalSales = salesOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    const salesToday = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      isDeleted: false,
      createdAt: { $gte: startOfToday }
    });
    const todaySalesAmount = salesToday.reduce((sum, order) => sum + (order.total || 0), 0);

    // 4. Pending Orders
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['Placed', 'Processing'] },
      isDeleted: false
    });

    // 5. Return Requests
    const returnRequests = await Order.countDocuments({
      orderStatus: { $in: ['Return Requested', 'Partially Return Requested'] },
      isDeleted: false
    });

    // 6. Cancelled Orders
    const cancelledOrders = await Order.countDocuments({
      orderStatus: { $in: ['Cancelled', 'Partially Cancelled'] },
      isDeleted: false
    });

    return {
      totalUsers: {
        value: totalUsers.toLocaleString('en-IN'),
        rawValue: totalUsers,
        newToday: newUsersToday
      },
      totalOrders: {
        value: totalOrders.toLocaleString('en-IN'),
        rawValue: totalOrders,
        today: ordersToday
      },
      totalSales: {
        value: formatCurrency(totalSales),
        rawValue: totalSales,
        today: formatCurrency(todaySalesAmount),
        todayRaw: todaySalesAmount
      },
      pendingOrders: {
        value: pendingOrders.toLocaleString('en-IN'),
        rawValue: pendingOrders
      },
      returnRequests: {
        value: returnRequests.toLocaleString('en-IN'),
        rawValue: returnRequests
      },
      cancelledOrders: {
        value: cancelledOrders.toLocaleString('en-IN'),
        rawValue: cancelledOrders
      }
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return {
      totalUsers: { value: '0', rawValue: 0, newToday: 0 },
      totalOrders: { value: '0', rawValue: 0, today: 0 },
      totalSales: { value: '₹0', rawValue: 0, today: '₹0', todayRaw: 0 },
      pendingOrders: { value: '0', rawValue: 0 },
      returnRequests: { value: '0', rawValue: 0 },
      cancelledOrders: { value: '0', rawValue: 0 }
    };
  }
};

// Get recent orders for dashboard
const getRecentOrders = async () => {
  try {
    const recentOrders = await Order.find({ isDeleted: false })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber user total orderStatus paymentMethod createdAt items');

    return recentOrders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.user?.fullName || 'Guest',
      customerEmail: order.user?.email || '',
      total: formatCurrency(order.total),
      status: order.orderStatus,
      paymentMethod: order.paymentMethod.toUpperCase(),
      itemCount: order.items.length,
      createdAt: order.createdAt,
      formattedDate: formatDate(order.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }
};

// Get order analytics
const getOrderAnalytics = async () => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Order status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    // Payment method breakdown
    const paymentBreakdown = await Order.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    // Weekly order trends
    const weeklyOrders = await Order.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    return {
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      paymentBreakdown: paymentBreakdown.reduce((acc, item) => {
        acc[item._id.toUpperCase()] = {
          count: item.count,
          total: formatCurrency(item.total)
        };
        return acc;
      }, {}),
      weeklyTrends: weeklyOrders
    };
  } catch (error) {
    console.error('Error calculating order analytics:', error);
    return { statusBreakdown: {}, paymentBreakdown: {}, weeklyTrends: [] };
  }
};

// Get product analytics
const getProductAnalytics = async () => {
  try {
    // Low stock products (stock < 10)
    const lowStockProducts = await Product.find({
      isDeleted: false,
      isListed: true,
      stock: { $lt: 10 }
    })
    .populate('category', 'name')
    .select('title stock category mainImage')
    .limit(10);

    // Top selling products (based on order items)
    const topProducts = await Order.aggregate([
      { $match: { isDeleted: false, orderStatus: { $in: ['Delivered', 'Shipped'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.discountedPrice'] } },
          title: { $first: '$items.title' },
          image: { $first: '$items.image' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // Recently added products
    const recentProducts = await Product.find({
      isDeleted: false,
      isListed: true
    })
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title salePrice category mainImage createdAt');

    return {
      lowStockProducts: lowStockProducts.map(product => ({
        id: product._id,
        title: product.title,
        stock: product.stock,
        category: product.category?.name || 'Uncategorized',
        image: product.mainImage,
        stockStatus: product.stock === 0 ? 'Out of Stock' : 'Low Stock'
      })),
      topProducts: topProducts.map(product => ({
        id: product._id,
        title: product.title,
        totalSold: product.totalSold,
        revenue: formatCurrency(product.revenue),
        image: product.image
      })),
      recentProducts: recentProducts.map(product => ({
        id: product._id,
        title: product.title,
        price: formatCurrency(product.salePrice),
        category: product.category?.name || 'Uncategorized',
        image: product.mainImage,
        addedDate: formatDate(product.createdAt)
      }))
    };
  } catch (error) {
    console.error('Error calculating product analytics:', error);
    return { lowStockProducts: [], topProducts: [], recentProducts: [] };
  }
};

// Get user analytics
const getUserAnalytics = async () => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // New registrations
    const newUsersToday = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: startOfToday }
    });

    const newUsersThisWeek = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: startOfWeek }
    });

    const newUsersThisMonth = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: startOfMonth }
    });

    // Active users (users with orders in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await Order.distinct('user', {
      isDeleted: false,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Recent registrations
    const recentUsers = await User.find({
      isAdmin: false
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('fullName email createdAt isVerified');

    return {
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsersCount: activeUsers.length,
      recentUsers: recentUsers.map(user => ({
        id: user._id,
        name: user.fullName,
        email: user.email,
        joinDate: formatDate(user.createdAt),
        isVerified: user.isVerified
      }))
    };
  } catch (error) {
    console.error('Error calculating user analytics:', error);
    return {
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      activeUsersCount: 0,
      recentUsers: []
    };
  }
};

// Get financial analytics
const getFinancialAnalytics = async () => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Revenue calculations
    const revenueToday = await calculateRevenue(startOfToday);
    const revenueThisWeek = await calculateRevenue(startOfWeek);
    const revenueThisMonth = await calculateRevenue(startOfMonth);
    const revenueThisYear = await calculateRevenue(startOfYear);

    // Average order value
    const completedOrders = await Order.find({
      orderStatus: { $in: ['Delivered', 'Shipped'] },
      isDeleted: false
    });
    const avgOrderValue = completedOrders.length > 0
      ? completedOrders.reduce((sum, order) => sum + order.total, 0) / completedOrders.length
      : 0;

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = await getMonthlyRevenueTrend();

    return {
      revenueToday: formatCurrency(revenueToday),
      revenueThisWeek: formatCurrency(revenueThisWeek),
      revenueThisMonth: formatCurrency(revenueThisMonth),
      revenueThisYear: formatCurrency(revenueThisYear),
      avgOrderValue: formatCurrency(avgOrderValue),
      monthlyTrend: monthlyRevenue
    };
  } catch (error) {
    console.error('Error calculating financial analytics:', error);
    return {
      revenueToday: '₹0',
      revenueThisWeek: '₹0',
      revenueThisMonth: '₹0',
      revenueThisYear: '₹0',
      avgOrderValue: '₹0',
      monthlyTrend: []
    };
  }
};

// Get system notifications
const getSystemNotifications = async () => {
  try {
    const notifications = [];

    // Low stock alerts
    const lowStockCount = await Product.countDocuments({
      isDeleted: false,
      isListed: true,
      stock: { $lt: 10 }
    });

    if (lowStockCount > 0) {
      notifications.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockCount} products are running low on stock`,
        action: '/admin/getProducts',
        actionText: 'View Products',
        priority: 'high'
      });
    }

    // Pending return requests
    const pendingReturns = await Order.countDocuments({
      orderStatus: { $in: ['Return Requested', 'Partially Return Requested'] },
      isDeleted: false
    });

    if (pendingReturns > 0) {
      notifications.push({
        type: 'info',
        title: 'Return Requests',
        message: `${pendingReturns} return requests need attention`,
        action: '/admin/return-management',
        actionText: 'View Returns',
        priority: 'medium'
      });
    }

    // Pending orders
    const pendingOrdersCount = await Order.countDocuments({
      orderStatus: 'Placed',
      isDeleted: false
    });

    if (pendingOrdersCount > 0) {
      notifications.push({
        type: 'primary',
        title: 'New Orders',
        message: `${pendingOrdersCount} new orders need processing`,
        action: '/admin/getOrders',
        actionText: 'Process Orders',
        priority: 'high'
      });
    }

    return notifications.slice(0, 5); // Limit to 5 notifications
  } catch (error) {
    console.error('Error fetching system notifications:', error);
    return [];
  }
};

// Get chart data for visualizations
const getChartData = async () => {
  try {
    // Sales trend for last 7 days
    const salesTrend = await getDailySalesTrend();

    // Order status distribution
    const orderStatusData = await Order.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    // Payment method distribution
    const paymentMethodData = await Order.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    return {
      salesTrend,
      orderStatus: orderStatusData.map(item => ({
        label: item._id,
        value: item.count
      })),
      paymentMethods: paymentMethodData.map(item => ({
        label: item._id.toUpperCase(),
        value: item.count,
        total: item.total
      }))
    };
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return {
      salesTrend: [],
      orderStatus: [],
      paymentMethods: []
    };
  }
};

// Helper function to calculate revenue for a given period
const calculateRevenue = async (startDate) => {
  const orders = await Order.find({
    orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
    isDeleted: false,
    createdAt: { $gte: startDate }
  });
  return orders.reduce((sum, order) => sum + (order.total || 0), 0);
};

// Helper function to get monthly revenue trend
const getMonthlyRevenueTrend = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isDeleted: false,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return monthlyData.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.revenue,
      orders: item.orders
    }));
  } catch (error) {
    console.error('Error calculating monthly revenue trend:', error);
    return [];
  }
};

// Helper function to get daily sales trend
const getDailySalesTrend = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyData = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isDeleted: false,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return dailyData.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      revenue: item.revenue,
      orders: item.orders
    }));
  } catch (error) {
    console.error('Error calculating daily sales trend:', error);
    return [];
  }
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

// Helper function to format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// API Endpoints for real-time dashboard updates

// Get dashboard stats API
const getDashboardStats = async (req, res) => {
  try {
    const stats = await calculateDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get chart data API
const getChartDataAPI = async (req, res) => {
  try {
    const { period = '7' } = req.query;
    const chartData = await getChartData(parseInt(period));
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data'
    });
  }
};

// Get recent orders API
const getRecentOrdersAPI = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const recentOrders = await getRecentOrders(parseInt(limit));
    res.json({
      success: true,
      data: recentOrders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders'
    });
  }
};

// Get notifications API
const getNotificationsAPI = async (req, res) => {
  try {
    const notifications = await getSystemNotifications();
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// Get low stock products API
const getLowStockAPI = async (req, res) => {
  try {
    const productAnalytics = await getProductAnalytics();
    res.json({
      success: true,
      data: productAnalytics.lowStockProducts
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products'
    });
  }
};

// Get top products API
const getTopProductsAPI = async (req, res) => {
  try {
    const productAnalytics = await getProductAnalytics();
    res.json({
      success: true,
      data: productAnalytics.topProducts
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products'
    });
  }
};

// Process order API (Quick Action)
const processOrderAPI = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action } = req.body; // 'ship', 'deliver', 'cancel', etc.

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let newStatus;
    switch (action) {
      case 'ship':
        newStatus = 'Shipped';
        break;
      case 'deliver':
        newStatus = 'Delivered';
        break;
      case 'cancel':
        newStatus = 'Cancelled';
        break;
      case 'process':
        newStatus = 'Processing';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    order.orderStatus = newStatus;
    order.updatedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: `Order ${action}ed successfully`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        newStatus: newStatus
      }
    });
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process order'
    });
  }
};

// Update stock API (Quick Action)
const updateStockAPI = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock value'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.stock = stock;
    product.updatedAt = new Date();
    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        productId: product._id,
        title: product.title,
        newStock: stock
      }
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
};

// Mark notification as read API
const markNotificationReadAPI = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // This would typically update a notifications collection
    // For now, we'll just return success since notifications are generated dynamically
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notificationId: notificationId
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

module.exports = {
  getDashboard,
  getDashboardStats,
  getChartData: getChartDataAPI,
  getRecentOrdersAPI,
  getNotificationsAPI,
  getLowStockAPI,
  getTopProductsAPI,
  processOrderAPI,
  updateStockAPI,
  markNotificationReadAPI
};
