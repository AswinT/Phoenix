const Cart = require('../models/cartSchema');
const Wishlist = require('../models/wishlistSchema');
const cartWishlistMiddleware = async (req, res, next) => {
  try {
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    if (req.session && req.session.user_id) {
      const userId = req.session.user_id;
      const cart = await Cart.findOne({ user: userId });
      if (cart && cart.items) {
        res.locals.cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      const wishlist = await Wishlist.findOne({ user: userId });
      if (wishlist && wishlist.items) {
        res.locals.wishlistCount = wishlist.items.length;
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