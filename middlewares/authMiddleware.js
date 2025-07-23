const User = require('../models/userSchema');

const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.user_id) {
    try {
      const user = await User.findById(req.session.user_id).lean();
      // Account not found - clean up session
      if (!user) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                                req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                                req.path.includes('/api/') ||
                                req.path.includes('/orders/') ||
                                req.path.includes('/checkout/');
        if (isApiRequest) {
          return res.status(401).json({
            success: false,
            message: 'User account not found. Please log in again.',
            requiresAuth: true,
            redirectTo: '/login'
          });
        }
        return res.redirect('/login?error=account_not_found');
      }
      // Account blocked - clean up session
      if (user.isBlocked) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                                req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                                req.path.includes('/api/') ||
                                req.path.includes('/orders/') ||
                                req.path.includes('/checkout/');
        if (isApiRequest) {
          return res.status(403).json({
            success: false,
            message: 'Your account has been blocked by the administrator. Please contact support.',
            blocked: true,
            redirectTo: '/login?error=blocked'
          });
        }
        return res.redirect('/login?error=blocked');
      }
      return next();
    } catch (error) {
      console.error('Error checking user status:', error);
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                              req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                              req.path.includes('/api/') ||
                              req.path.includes('/orders/') ||
                              req.path.includes('/checkout/');
      if (isApiRequest) {
        return res.status(500).json({
          success: false,
          message: 'Authentication error. Please log in again.',
          requiresAuth: true,
          redirectTo: '/login'
        });
      }
      return res.redirect('/login?error=auth_error');
    }
  }
  const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                          req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                          req.path.includes('/api/') ||
                          req.path.includes('/orders/') ||
                          req.path.includes('/checkout/');
  if (isApiRequest) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to continue',
      requiresAuth: true,
      redirectTo: '/login'
    });
  }
  return res.redirect('/login');
};
// Redirect logged in users away from auth pages
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.user_id) {
    return res.redirect('/');
  }
  return next();
};
// Prevent browser back button cache
const preventBackButtonCache = (req, res, next) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
};
module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  preventBackButtonCache
};