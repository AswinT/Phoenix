const {HttpStatus} = require('../../helpers/statusCode');
const logout = async (req, res) => {
  try {
    // Set cache control headers first
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');

    // Function to clear session data and cookies
    const clearSessionAndCookies = () => {
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
    };

    // Check if user is authenticated via Passport.js (Google OAuth)
    if (req.isAuthenticated && req.isAuthenticated()) {
      // For Google OAuth users, use req.logout() to properly clear Passport session
      req.logout((err) => {
        if (err) {
          console.error('Passport logout error:', err);
          // Continue with manual cleanup even if passport logout fails
        }

        // Clear custom session data and cookies
        clearSessionAndCookies();

        // Save the session after clearing data
        if (req.session) {
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Error saving session after logout:', saveErr);
              return res.redirect('/login?error=logout_partial');
            }
            res.redirect('/login?message=logged_out');
          });
        } else {
          res.redirect('/login?message=logged_out');
        }
      });
    } else {
      // For regular users or if no Passport session exists
      clearSessionAndCookies();

      if (req.session) {
        // Save the session after clearing user data
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session after user logout:', err);
            return res.redirect('/login?error=logout_partial');
          }
          res.redirect('/login?message=logged_out');
        });
      } else {
        res.redirect('/login');
      }
    }
  } catch (error) {
    console.error('Logout error:', error);

    // Emergency cleanup on error
    try {
      // Try to logout from Passport if possible
      if (req.logout && typeof req.logout === 'function') {
        req.logout(() => {});
      }
    } catch (passportErr) {
      console.error('Emergency passport logout error:', passportErr);
    }

    // Clear cookies even on error
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