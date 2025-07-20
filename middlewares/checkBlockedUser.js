const User = require('../models/userSchema');

// Check if user is blocked before allowing access
const checkBlockedUser = async (req, res, next) => {
  try {
    // Verify user exists and is not blocked
    if (req.session && req.session.user_id) {
      const user = await User.findById(req.session.user_id).lean();
      // User not found - destroy session
      if (!user) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        return res.redirect('/login?error=account_not_found');
      }
      // User is blocked - destroy session
      if (user.isBlocked) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        return res.redirect('/login?error=blocked');
      }
    }
    return next();
  } catch (error) {
    console.error('Error checking blocked user:', error);
    if (req.session && req.session.user_id) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      return res.redirect('/login?error=auth_error');
    }
    return next();
  }
};
module.exports = checkBlockedUser;