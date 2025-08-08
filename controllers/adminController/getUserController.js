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
          { phone: { $regex: searchTerm, $options: 'i' } },
        ],
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
      searchTerm,
    });
  } catch {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server error');
  }
};
const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID format
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid user ID format',
        errorType: 'INVALID_ID'
      });
    }

    // Check if user exists first
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        errorType: 'USER_NOT_FOUND'
      });
    }

    // Check if user is already blocked
    if (existingUser.isBlocked) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'User is already blocked',
        errorType: 'ALREADY_BLOCKED'
      });
    }

    // Check if trying to block an admin
    if (existingUser.isAdmin) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Cannot block admin users',
        errorType: 'ADMIN_BLOCK_FORBIDDEN'
      });
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update user status',
        errorType: 'UPDATE_FAILED'
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User blocked successfully',
      user: {
        id: user._id,
        isBlocked: user.isBlocked,
        fullName: user.fullName,
        email: user.email
      },
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An error occurred while blocking the user. Please try again.',
      errorType: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID format
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid user ID format',
        errorType: 'INVALID_ID'
      });
    }

    // Check if user exists first
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        errorType: 'USER_NOT_FOUND'
      });
    }

    // Check if user is already unblocked
    if (!existingUser.isBlocked) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'User is already unblocked',
        errorType: 'ALREADY_UNBLOCKED'
      });
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update user status',
        errorType: 'UPDATE_FAILED'
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User unblocked successfully',
      user: {
        id: user._id,
        isBlocked: user.isBlocked,
        fullName: user.fullName,
        email: user.email
      },
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An error occurred while unblocking the user. Please try again.',
      errorType: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
module.exports = { getUsers,blockUser,unblockUser };