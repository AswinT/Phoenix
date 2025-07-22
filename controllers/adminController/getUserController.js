const User = require('../../models/userSchema');
const { HttpStatus } = require('../../helpers/statusCode');
const getUsers = async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    let searchQuery = {};
    if (searchTerm) {
      searchQuery = {
        $or: [
          { fullName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const totalUsers = await User.countDocuments(searchQuery);
    const users = await User.find(searchQuery).skip(skip).limit(limit);
    const totalPages = Math.ceil(totalUsers / limit);
    const startIdx = skip;
    const endIdx = Math.min(skip + limit, totalUsers);
    res.render('getUser', {
      users: users || [],
      currentPage: page,
      totalPages,
      totalUsers,
      startIdx,
      endIdx,
      searchTerm
    });
  } catch (error) {
    console.log('Error in getting User', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server error');
  }
};
const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User blocked successfully ',
      user: { id: user._id, isBlocked: user.isBlocked }
    });
  } catch (error) {
    console.log(`Error in deleting user,${error}`);
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'server error'
    });
  }
};
const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false},
      { new: true }
    );
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.log(`Error in unblocking user,${error}`);
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Get specific user details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('referredBy', 'fullName email')
      .select('-password');

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get user's recent orders
    const recentOrders = await Order.find({ user: user._id })
      .populate('items.product', 'productName')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get referral statistics
    const referralStats = await User.countDocuments({ referredBy: user._id });

    const userDetails = {
      user,
      statistics: {
        totalOrders: orderStats[0]?.totalOrders || 0,
        totalSpent: orderStats[0]?.totalSpent || 0,
        averageOrderValue: orderStats[0]?.averageOrderValue || 0,
        totalReferrals: referralStats
      },
      recentOrders
    };

    res.status(HttpStatus.OK).json({
      success: true,
      userDetails
    });

  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Search users by various criteria
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchUsers = async (req, res) => {
  try {
    const { query, status, dateFrom, dateTo } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let searchCriteria = {};

    // Text search in user details
    if (query) {
      searchCriteria.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        searchCriteria.isBlocked = false;
      } else if (status === 'blocked') {
        searchCriteria.isBlocked = true;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      searchCriteria.createdAt = {};
      if (dateFrom) {
        searchCriteria.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        searchCriteria.createdAt.$lte = new Date(dateTo);
      }
    }

    const users = await User.find(searchCriteria)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(HttpStatus.OK).json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user analytics and statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days
    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Total users
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Active vs blocked users
    const activeUsers = await User.countDocuments({ isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    // User registration trends
    const registrationTrends = await User.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Top referrers
    const topReferrers = await User.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'referredBy',
          as: 'referrals'
        }
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          referralCount: { $size: '$referrals' }
        }
      },
      {
        $match: { referralCount: { $gt: 0 } }
      },
      {
        $sort: { referralCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const analytics = {
      summary: {
        totalUsers,
        newUsers,
        activeUsers,
        blockedUsers
      },
      registrationTrends,
      topReferrers
    };

    res.status(HttpStatus.OK).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getUsers,
  blockUser,
  unblockUser,
  getUserDetails,
  searchUsers,
  getUserAnalytics
};
