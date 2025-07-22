const Category = require('../../models/categorySchema');
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true }).sort({
      createdAt: -1
    });

    // Use a simpler approach - just return JSON for now to test
    res.status(200).json({
      success: true,
      message: 'Categories loaded successfully',
      categories: categories || [],
      count: categories ? categories.length : 0
    });
  } catch (error) {
    console.error('Error fetching categories:', error);

    // Try to render a simpler error page or fallback
    try {
      res.status(500).render('user/page-404', {
        title: 'Categories Unavailable - Phoenix Store',
        user: res.locals.user || null
      });
    } catch (renderError) {
      // If even the error page fails, send a simple response
      res.status(500).json({
        error: 'Unable to load categories',
        message: 'Please try again later'
      });
    }
  }
};
module.exports = {
  getCategories
};
