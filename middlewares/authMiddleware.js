// Auth Middleware
const isAuthenticated = (req, res, next) => {
     console.log('=== AUTH MIDDLEWARE DEBUG ===');
     console.log('URL:', req.originalUrl);
     console.log('Session exists:', !!req.session);
     console.log('User ID in session:', req.session?.user_id);

     if (req.session && req.session.user_id) {
       console.log('Authentication passed, proceeding to next middleware');
       return next();
     }

     console.log('Authentication failed, redirecting to login');

     if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
       return res.status(401).json({
         success: false,
         message: 'Please log in to continue',
         requiresAuth: true,
         redirectTo: '/login'
       });
     }

     return res.redirect('/login');
   };
   

   const isNotAuthenticated = (req, res, next) => {
     if (req.session && req.session.user_id) {
       return res.redirect('/');
     }
     return next();
   };
   

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