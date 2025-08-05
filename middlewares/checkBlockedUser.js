const User = require('../models/userSchema');

const checkBlockedUser = async (req, res, next) => {
  try {
    if (req.session && req.session.user_id) {
      const user = await User.findById(req.session.user_id).lean();
      if (!user) {
        delete req.session.user_id;
        delete req.session.user_email;
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session after removing user_id:', err);
          }
        });
        return res.redirect('/login?error=account_not_found');
      }
      if (user.isBlocked) {
        delete req.session.user_id;
        delete req.session.user_email;
        req.session.showBlockedAlert = true;
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