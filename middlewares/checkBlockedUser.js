/**
 * Middleware to check if a logged-in user is blocked
 * This middleware can be used on public pages to check if a logged-in user has been blocked
 * If user is blocked, it logs them out and redirects to login with error message
 */

const User = require('../models/userSchema');

const checkBlockedUser = async (req, res, next) => {
  try {
    // Only check if user is logged in
    if (req.session && req.session.user_id) {
      // Check if user exists and is not blocked
      const user = await User.findById(req.session.user_id).lean();
      
      if (!user) {
        // User not found, clear session and redirect
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        
        return res.redirect('/login?error=account_not_found');
      }

      if (user.isBlocked) {
        // User is blocked, clear session and redirect with error
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });

        return res.redirect('/login?error=blocked');
      }
    }

    // User is not logged in or is valid and not blocked, continue
    return next();
  } catch (error) {
    console.error('Error checking blocked user:', error);
    
    // On database error, clear session if exists and continue
    if (req.session && req.session.user_id) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      
      return res.redirect('/login?error=auth_error');
    }
    
    // If no session, just continue
    return next();
  }
};

module.exports = checkBlockedUser;