const User = require('../models/userSchema');
const { HttpStatus } = require('../helpers/statusCode');
const adminMiddleware = {
  isAdminAuthenticated: async (req, res, next) => {
    try {
      if (req.session?.admin_id) {
        const admin = await User.findOne({ _id: req.session.admin_id, isAdmin: true });
        if (admin) {
          res.locals.admin = admin;
          return next();
        }
      }
      return res.redirect('/admin/dashboard/login');
    } catch (err) {
      console.error('Admin auth error:', err);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/admin/dashboard/login');
    }
  },
  isAdminNotAuthenticated: async (req, res, next) => {
    try {
      if (req.session?.admin_id) {
        const admin = await User.findOne({ _id: req.session.admin_id, isAdmin: true });
        if (admin) {
          return res.redirect('/admin/dashboard');
        }
      }
      next();
    } catch (err) {
      console.error('Admin not-auth error:', err);
      next();
    }
  },
  preventCache: (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  }
};
module.exports = adminMiddleware;
