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

      // Check if this is an AJAX request
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['content-type']?.includes('multipart/form-data')) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please log in to continue'],
          redirect: '/admin/auth/login'
        });
      }

      return res.redirect('/admin/auth/login');
    } catch (err) {
      console.error('Admin auth error:', err);

      // Check if this is an AJAX request
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['content-type']?.includes('multipart/form-data')) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Server error',
          errors: ['An unexpected error occurred'],
          redirect: '/admin/auth/login'
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/admin/auth/login');
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