const User = require("../../models/user-schema");
const bcrypt = require("bcrypt");

// Helper function to validate admin credentials
const validateAdminCredentials = async (email, password) => {
  if (!email || !password) {
    return { 
      isValid: false, 
      message: "Email and password are required" 
    };
  }

  const admin = await User.findOne({ email, isAdmin: true });

  if (!admin) {
    return { 
      isValid: false, 
      message: "Administrator not found" 
    };
  }

  if (admin.isBlocked) {
    return { 
      isValid: false, 
      message: "This admin account has been blocked" 
    };
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    return { 
      isValid: false, 
      message: "Invalid credentials" 
    };
  }

  return { 
    isValid: true, 
    admin 
  };
};

// Page Loading Controllers
const getAdminLogin = async (req, res) => {
  try {
    res.render("admin-login");
  } catch (error) {
    console.error("Error loading admin login page:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    return res.render('admin-dashboard', {
      admin: res.locals.admin
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load Dashboard",
    });
  }
};

// Authentication Controllers
const postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validation = await validateAdminCredentials(email, password);

    if (!validation.isValid) {
      return res.status(401).json({ 
        success: false, 
        message: validation.message 
      });
    }

    req.session.admin_id = validation.admin._id;

    return res.status(200).json({
      success: true,
      message: "Welcome Admin",
      redirectTo: '/admin/dashboard',
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Admin login error" 
    });
  }
};

const logoutAdminDashboard = async (req, res) => {
  try {
    if (!req.session.admin_id) {
      return res.status(400).json({
        success: false,
        message: "No active admin session to logout from",
      });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to logout. Please try again.',
        });
      }

      res.clearCookie('connect.sid', { path: '/' });
      return res.redirect('/admin/login');
    });
  } catch (error) {
    console.error('Error in AdminLogout:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error' 
    });
  }
};

module.exports = { 
  getAdminLogin, 
  postAdminLogin, 
  getAdminDashboard, 
  logoutAdminDashboard 
};
