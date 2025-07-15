const Wishlist = require("../../models/wishlistSchema")
const Product = require("../../models/productSchema")
const Cart = require("../../models/cartSchema")
const { HttpStatus } = require("../../helpers/status-code")

const getWishlist = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect("/login")
    }

    const userId = req.session.user_id
    const page = Number.parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const wishlist = await Wishlist.findOne({ user: userId }).populate("items.product")
    const cart = await Cart.findOne({ user: userId })

    let wishlistItems = []
    let totalItems = 0
    let inStockItems = 0
    let lowStockItems = 0
    let outOfStockItems = 0
    let cartCount = 0
    let wishlistCount = 0

    if (wishlist && wishlist.items.length > 0) {
      wishlistItems = wishlist.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted)
      totalItems = wishlistItems.length
      wishlistCount = totalItems

      // Count stock status for wishlist items
      for (const item of wishlistItems) {
        if (item.product.stock > 10) {
          inStockItems++
        } else if (item.product.stock > 0) {
          lowStockItems++
        } else {
          outOfStockItems++
        }
      }

      wishlistItems = wishlistItems.slice(skip, skip + limit)
    }

    if (cart) {
      cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    }

    const totalPages = Math.ceil(totalItems / limit)

    // Fetch recently viewed products (randomly select 4 products)
    const recentlyViewed = await Product.aggregate([
      { $match: { isListed: true, isDeleted: false } },
      { $sample: { size: 4 } },
    ])

    res.render("wishlist", {
      wishlistItems,
      totalItems,
      inStockItems,
      lowStockItems,
      outOfStockItems,
      recentlyViewed,
      currentPage: page,
      totalPages,
      cartCount,
      wishlistCount,
      user: userId ? { id: userId } : null,
      isAuthenticated: true,
    })
  } catch (error) {
    console.log("Error in rendering wishlist:", error)
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error")
  }
}


const toggleWishlist = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please log in to manage your wishlist',
        requiresAuth: true,
        redirectTo: '/login'
      });
    }

    const userId = req.session.user_id;
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found or unavailable' });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        items: [{ product: productId }]
      });
      await wishlist.save();
      return res.json({ success: true, message: 'Added to wishlist', isWishlisted: true, wishlistCount: 1 });
    }

    const itemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      wishlist.items.splice(itemIndex, 1);
      await wishlist.save();
      return res.json({ success: true, message: 'Removed from wishlist', isWishlisted: false, wishlistCount: wishlist.items.length });
    } else {
      wishlist.items.push({ product: productId });
      await wishlist.save();
      return res.json({ success: true, message: 'Added to wishlist', isWishlisted: true, wishlistCount: wishlist.items.length });
    }
  } catch (error) {
    console.log('Error toggling wishlist:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

const addAllToCart = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in' });
    }

    const userId = req.session.user_id;
    const wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');

    if (!wishlist || wishlist.items.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Wishlist is empty' });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [], totalAmount: 0 });
    }

    const messages = [];
    const MAX_QUANTITY_PER_PRODUCT = 5; // Maximum 5 quantity per product
    const availableItems = wishlist.items.filter(item => item.product && item.product.isListed && !item.product.isDeleted && item.product.stock > 0);

    for (const item of availableItems) {
      const product = item.product;
      const itemIndex = cart.items.findIndex(cartItem => cartItem.product.toString() === product._id.toString());

      if (itemIndex > -1) {
        const newQuantity = cart.items[itemIndex].quantity + 1;

        // Check quantity limit per product
        if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
          messages.push(`${product.title}: Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product`);
          continue;
        }

        if (newQuantity <= product.stock) {
          cart.items[itemIndex].quantity = newQuantity;
          cart.items[itemIndex].priceAtAddition = product.salePrice;
        } else {
          messages.push(`${product.title}: Only ${product.stock} items in stock`);
          continue;
        }
      } else {
        cart.items.push({
          product: product._id,
          quantity: 1,
          priceAtAddition: product.salePrice
        });
      }
    }

    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.quantity * item.priceAtAddition), 0);
    await cart.save();

    // Clear the wishlist after successfully adding items to cart
    await Wishlist.findOneAndDelete({ user: userId });

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const wishlistCount = 0; // Wishlist is now empty

    res.json({
      success: true,
      message: 'Items added to cart and removed from wishlist',
      cartCount,
      wishlistCount,
      warnings: messages
    });
  } catch (error) {
    console.log('Error adding all to cart:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in' });
    }

    const userId = req.session.user_id;
    const { productId } = req.body;

    // Find the product and validate it
    const product = await Product.findById(productId);
    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found or unavailable' });
    }

    if (product.stock === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Product is out of stock' });
    }

    // Find user's cart and wishlist
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [], totalAmount: 0 });
    }

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Wishlist not found' });
    }

    // Check if product is in wishlist
    const wishlistItemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);
    if (wishlistItemIndex === -1) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found in wishlist' });
    }

    // Check if product is already in cart
    const cartItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    const MAX_QUANTITY_PER_PRODUCT = 5;

    if (cartItemIndex > -1) {
      const newQuantity = cart.items[cartItemIndex].quantity + 1;

      if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product`
        });
      }

      if (newQuantity <= product.stock) {
        cart.items[cartItemIndex].quantity = newQuantity;
        cart.items[cartItemIndex].priceAtAddition = product.salePrice;
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Only ${product.stock} items in stock`
        });
      }
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity: 1,
        priceAtAddition: product.salePrice
      });
    }

    // Update cart total and save
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.quantity * item.priceAtAddition), 0);
    await cart.save();

    // Remove item from wishlist
    wishlist.items.splice(wishlistItemIndex, 1);
    await wishlist.save();

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const wishlistCount = wishlist.items.length;

    res.json({
      success: true,
      message: 'Item added to cart and removed from wishlist',
      cartCount,
      wishlistCount
    });

  } catch (error) {
    console.log('Error adding to cart from wishlist:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

const clearWishlist = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in' });
    }

    const userId = req.session.user_id;
    await Wishlist.findOneAndDelete({ user: userId });

    res.json({ success: true, message: 'Wishlist cleared', wishlistCount: 0 });
  } catch (error) {
    console.log('Error clearing wishlist:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getWishlist, toggleWishlist, addAllToCart, addToCartFromWishlist, clearWishlist };