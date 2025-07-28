const User = require('../models/userSchema');

// Check if user is blocked before allowing access
const checkBlockedUser = async (req, res, next) => {
  try {
    // Verify user exists and is not blocked
    if (req.session && req.session.user_id) {
      const user = await User.findById(req.session.user_id).lean();
      // User not found - remove only user_id from session (preserve admin_id if exists)
      if (!user) {
        delete req.session.user_id;
        delete req.session.user_email;
        // Save session to persist changes
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session after removing user_id:', err);
          }
        });
        return res.redirect('/login?error=account_not_found');
      }
      // User is blocked - remove only user_id from session (preserve admin_id if exists)
      if (user.isBlocked) {
        delete req.session.user_id;
        delete req.session.user_email;
        // Set flag for frontend to show blocked alert
        req.session.showBlockedAlert = true;
        // Save session to persist changes
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session after removing user_id:', err);
          }
        });
        return res.redirect('/login?error=blocked');
      }
    }
    return next();
  } catch (error) {
    console.error('Error checking blocked user:', error);
    if (req.session && req.session.user_id) {
      delete req.session.user_id;
      delete req.session.user_email;
      // Save session to persist changes
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after removing user_id:', err);
        }
      });
      return res.redirect('/login?error=auth_error');
    }
    return next();
  }
};
module.exports = checkBlockedUser;