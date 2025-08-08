const User = require('../../models/userSchema');
const bcrypt = require('bcrypt');
const { HttpStatus } = require('../../helpers/statusCode');
const getAdminLogin = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.render('adminLogin');
  } catch (error) {
    console.error('Error loading admin login page:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
const postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (!admin) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Admin not found or not authorized',
      });
    }
    if (admin.isBlocked) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'This admin account has been blocked',
      });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
    req.session.admin_id = admin._id;
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Welcome Admin',
      redirectTo: '/admin/dashboard',
    });
  } catch {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Admin login error',
    });
  }
};
const logoutAdminDashboard = async (req, res) => {
  try {
    // Only clear admin-specific session data, not the entire session
    // This prevents user sessions from being destroyed when admins log out
    if (req.session.admin_id) {
      delete req.session.admin_id;

      // Save the session after clearing admin data
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after admin logout:', err);
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Logout Failed');
        }

        res.clearCookie('connect.sid');
        res.redirect('/admin/auth/login');
      });
    } else {
      // If no admin session exists, just redirect
      res.clearCookie('connect.sid');
      res.redirect('/admin/auth/login');
    }
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
  }
};
module.exports = {
  getAdminLogin,
  postAdminLogin,
  logoutAdminDashboard
};