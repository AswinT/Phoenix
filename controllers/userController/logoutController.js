const {HttpStatus} = require('../../helpers/statusCode');
const logout = async (req, res) => {
  try {
    // Set cache control headers first
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');

    // Clear all user-specific session data
    if (req.session) {
      // Clear user authentication data
      delete req.session.user_id;
      delete req.session.user_email;
      delete req.session.newEmail;
      delete req.session.showBlockedAlert;

      // Clear any OTP-related session data
      delete req.session.emailChangeOtp;
      delete req.session.otp;
      delete req.session.otpExpiry;

      // Clear any cart/wishlist session data
      delete req.session.cart;
      delete req.session.wishlist;

      // Clear any temporary session data
      delete req.session.tempData;
      delete req.session.redirectUrl;

      // Save the session after clearing user data
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after user logout:', err);
          // Even if session save fails, still redirect to login
          return res.redirect('/login?error=logout_partial');
        }

        // Clear session cookies with multiple attempts for different configurations
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });

        // Also try clearing without options (fallback)
        res.clearCookie('connect.sid');

        // Clear any other potential auth cookies
        res.clearCookie('session');
        res.clearCookie('auth-token');
        res.clearCookie('user-token');

        // Successful logout
        res.redirect('/login?message=logged_out');
      });
    } else {
      // If no session exists, just redirect
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      res.clearCookie('connect.sid');
      res.clearCookie('session');
      res.clearCookie('auth-token');
      res.clearCookie('user-token');
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, try to redirect to login
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.clearCookie('connect.sid');
    res.clearCookie('session');
    res.clearCookie('auth-token');
    res.clearCookie('user-token');
    res.redirect('/login?error=logout_error');
  }
};
module.exports = { logout };