const Cart = require('../models/cartSchema');
const Wishlist = require('../models/wishlistSchema');
const cartWishlistMiddleware = async (req, res, next) => {
  try {
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    if (req.session && req.session.user_id) {
      const userId = req.session.user_id;

      // Calculate cart count
      const cart = await Cart.findOne({ user: userId });
      if (cart && cart.items) {
        res.locals.cartCount = cart.items.length;
      }

      // Calculate wishlist count with proper filtering (same as wishlist controller)
      const wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');
      if (wishlist && wishlist.items) {
        // Filter out items with deleted or unlisted products (same logic as wishlist controller)
        const validWishlistItems = wishlist.items.filter(
          (item) => item.product && item.product.isListed && !item.product.isDeleted
        );
        res.locals.wishlistCount = validWishlistItems.length;
      }
    }
    next();
  } catch (error) {
    console.error('Error in cartWishlistMiddleware:', error);
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    next();
  }
};
module.exports = cartWishlistMiddleware;