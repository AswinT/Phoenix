// middlewares/authMiddleware.js
const User = require('../models/userSchema');

/**
 * Middleware to check if user is authenticated and not blocked
 * Redirects to login if not authenticated (for page requests)
 * Returns JSON error for API requests
 * Logs out and redirects blocked users
 */
const isAuthenticated = async (req, res, next) => {
     if (req.session && req.session.user_id) {
       try {
         // Check if user exists and is not blocked
         const user = await User.findById(req.session.user_id).lean();
         
         if (!user) {
           // User not found, clear session and redirect
           req.session.destroy((err) => {
             if (err) {
               console.error('Error destroying session:', err);
             }
           });
           
           // Check if this is an API request
           const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                                req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                                req.path.includes('/api/') ||
                                req.path.includes('/orders/') ||
                                req.path.includes('/checkout/');

           if (isApiRequest) {
             return res.status(401).json({
               success: false,
               message: "User account not found. Please log in again.",
               requiresAuth: true,
               redirectTo: '/login'
             });
           }

           return res.redirect('/login?error=account_not_found');
         }

         if (user.isBlocked) {
           // User is blocked, clear session and redirect with error
           req.session.destroy((err) => {
             if (err) {
               console.error('Error destroying session:', err);
             }
           });

           // Check if this is an API request
           const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                                req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                                req.path.includes('/api/') ||
                                req.path.includes('/orders/') ||
                                req.path.includes('/checkout/');

           if (isApiRequest) {
             return res.status(403).json({
               success: false,
               message: "Your account has been blocked by the administrator. Please contact support.",
               blocked: true,
               redirectTo: '/login?error=blocked'
             });
           }

           return res.redirect('/login?error=blocked');
         }

         // User is valid and not blocked, continue
         return next();
       } catch (error) {
         console.error('Error checking user status:', error);
         
         // On database error, clear session and redirect
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
             message: "Authentication error. Please log in again.",
             requiresAuth: true,
             redirectTo: '/login'
           });
         }

         return res.redirect('/login?error=auth_error');
       }
     }

     // No session, user not authenticated
     // Check if this is an API request (JSON or AJAX)
     const isApiRequest = req.headers['content-type']?.includes('application/json') ||
                          req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                          req.path.includes('/api/') ||
                          req.path.includes('/orders/') ||
                          req.path.includes('/checkout/');

     if (isApiRequest) {
       return res.status(401).json({
         success: false,
         message: "Please log in to continue",
         requiresAuth: true,
         redirectTo: '/login'
       });
     }

     return res.redirect('/login');
   };
   
   /**
    * Middleware to check if user is already logged in
    * Redirects to home if authenticated
    */
   const isNotAuthenticated = (req, res, next) => {
     if (req.session && req.session.user_id) {
       return res.redirect('/');
     }
     return next();
   };
   
   /**
    * Middleware to prevent caching for pages that should not be accessible via back button
    * after logout
    */
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