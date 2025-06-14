const User = require("../../models/user-schema");

// Helper function to build search query
const buildSearchQuery = (searchTerm, statusFilter) => {
  let searchQuery = {};
  
  if (searchTerm) {
    searchQuery.$or = [
      { fullname: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { phone: { $regex: searchTerm, $options: 'i' } },
    ];
  }
  
  if (statusFilter) {
    searchQuery.isBlocked = statusFilter === 'blocked';
  }
  
  return searchQuery;
};

// Helper function to calculate pagination data
const calculatePagination = (page, totalUsers, limit) => {
  const totalPages = Math.ceil(totalUsers / limit);
  const startIdx = (page - 1) * limit;
  const endIdx = Math.min(startIdx + limit, totalUsers);
  
  return {
    totalPages,
    startIdx,
    endIdx,
    skip: (page - 1) * limit
  };
};

// Helper function to format user data for frontend
const formatUserData = (user) => {
  return {
    ...user,
    fullName: user.fullname && user.fullname.trim() !== '' 
      ? user.fullname 
      : user.email.split('@')[0],
    fullname: undefined
  };
};

// Helper function to fetch users with common logic
const fetchUsers = async (searchTerm, statusFilter, page, limit) => {
  const searchQuery = buildSearchQuery(searchTerm, statusFilter);
  
  const totalUsers = await User.countDocuments(searchQuery);
  const pagination = calculatePagination(page, totalUsers, limit);
  
  const users = await User.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(limit)
    .select('fullname email phone createdAt isBlocked _id')
    .lean();

  const modifiedUsers = users.map(formatUserData);
  
  return {
    users: modifiedUsers,
    totalUsers,
    totalPages: pagination.totalPages,
    startIdx: pagination.startIdx,
    endIdx: pagination.endIdx
  };
};

// Helper function to update user block status
const updateUserBlockStatus = async (userId, isBlocked) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isBlocked },
    { new: true }
  );
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

// Page Rendering Controller
const getUsers = async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const statusFilter = req.query.status || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const result = await fetchUsers(searchTerm, statusFilter, page, limit);

    res.render('customer-listing', {
      users: result.users,
      currentPage: page,
      totalPages: result.totalPages,
      totalUsers: result.totalUsers,
      startIdx: result.startIdx,
      endIdx: result.endIdx,
      searchTerm,
      statusFilter,
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).send('Server error');
  }
};

// API Controllers
const getUsersApi = async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const statusFilter = req.query.status || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const result = await fetchUsers(searchTerm, statusFilter, page, limit);

    res.status(200).json({
      success: true,
      users: result.users,
      currentPage: page,
      totalPages: result.totalPages,
      totalUsers: result.totalUsers,
      startIdx: result.startIdx,
      endIdx: result.endIdx,
    });
  } catch (error) {
    console.error('Error fetching users for API:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .select('fullname email phone createdAt isBlocked')
      .lean();
      
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const formattedUser = formatUserData(user);
    res.status(200).json(formattedUser);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// User Block Management
const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await updateUserBlockStatus(userId, true);

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      user: { 
        id: user._id, 
        isBlocked: user.isBlocked 
      },
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await updateUserBlockStatus(userId, false);

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      user: { 
        id: user._id, 
        isBlocked: user.isBlocked 
      },
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { 
  getUsers, 
  getUsersApi, 
  getUserById, 
  blockUser, 
  unblockUser 
};
