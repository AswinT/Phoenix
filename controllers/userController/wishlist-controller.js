const Wishlist = require("../../models/wishlistSchema")
const Product = require("../../models/productSchema")
const Cart = require("../../models/cartSchema")
const { getActiveOfferForProduct, calculateDiscount } = require("../../utils/offer-helper")
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

      // Get active offers for all products in wishlist
      for (const item of wishlistItems) {
        const offer = await getActiveOfferForProduct(
          item.product._id, 
          item.product.category,
          item.product.regularPrice
        )

        const { discountPercentage, discountAmount, finalPrice } = calculateDiscount(
          offer, 
          item.product.regularPrice
        )

        // Update product with offer information
        item.product.activeOffer = offer
        item.product.discountPercentage = discountPercentage
        item.product.discountAmount = discountAmount
        item.product.finalPrice = finalPrice
        item.product.regularPrice = item.product.regularPrice || item.product.salePrice
        item.product.salePrice = finalPrice // Update salePrice to reflect the discounted price

        // Count stock status
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

    // Get active offers for recently viewed products
    for (const product of recentlyViewed) {
      const offer = await getActiveOfferForProduct(
        product._id, 
        product.category,
        product.regularPrice
      )
      
      const { discountPercentage, discountAmount, finalPrice } = calculateDiscount(
        offer, 
        product.regularPrice
      )
      
      product.activeOffer = offer
      product.discountPercentage = discountPercentage
      product.discountAmount = discountAmount
      product.finalPrice = finalPrice
      product.regularPrice = product.regularPrice || product.salePrice
      product.salePrice = finalPrice // Update salePrice to reflect the discounted price
    }

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
    const successfullyAdded = [];
    const MAX_QUANTITY_PER_PRODUCT = 5;
    const { getActiveOfferForProduct, calculateDiscount } = require('../../utils/offer-helper');

    // Filter available items
    const availableItems = wishlist.items.filter(item =>
      item.product && item.product.isListed && !item.product.isDeleted && item.product.stock > 0
    );

    for (const item of availableItems) {
      const product = item.product;
      const itemIndex = cart.items.findIndex(cartItem => cartItem.product.toString() === product._id.toString());

      // Get active offer and calculate discounted price
      const offer = await getActiveOfferForProduct(product._id, product.category, product.regularPrice);
      const { finalPrice } = calculateDiscount(offer, product.regularPrice);

      if (itemIndex > -1) {
        const newQuantity = cart.items[itemIndex].quantity + 1;

        // Check quantity limit per product
        if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
          messages.push(`${product.model || product.title}: Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product`);
          continue;
        }

        if (newQuantity <= product.stock) {
          cart.items[itemIndex].quantity = newQuantity;
          cart.items[itemIndex].priceAtAddition = finalPrice;
          successfullyAdded.push(product._id.toString());
        } else {
          messages.push(`${product.model || product.title}: Only ${product.stock} items in stock`);
          continue;
        }
      } else {
        cart.items.push({
          product: product._id,
          quantity: 1,
          priceAtAddition: finalPrice
        });
        successfullyAdded.push(product._id.toString());
      }
    }

    // Update cart total and save
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.quantity * item.priceAtAddition), 0);
    await cart.save();

    // Remove successfully added items from wishlist
    if (successfullyAdded.length > 0) {
      wishlist.items = wishlist.items.filter(item =>
        !successfullyAdded.includes(item.product._id.toString())
      );
      await wishlist.save();
    }

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const wishlistCount = wishlist.items.length;

    // Create success message
    let successMessage = `${successfullyAdded.length} item${successfullyAdded.length !== 1 ? 's' : ''} moved to cart`;
    if (messages.length > 0) {
      successMessage += ` (${messages.length} item${messages.length !== 1 ? 's' : ''} skipped)`;
    }

    res.json({
      success: true,
      message: successMessage,
      cartCount,
      wishlistCount,
      warnings: messages,
      itemsAdded: successfullyAdded.length,
      itemsSkipped: messages.length
    });
  } catch (error) {
    console.log('Error adding all to cart:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please log in to add items to your cart',
        requiresAuth: true,
        redirectTo: '/login'
      });
    }

    const userId = req.session.user_id;
    const { productId, quantity = 1 } = req.body;

    // Find the product
    const product = await Product.findById(productId);
    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Product not found or unavailable'
      });
    }

    // Check if item is in user's wishlist
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const wishlistItemIndex = wishlist.items.findIndex(
      item => item.product.toString() === productId
    );

    if (wishlistItemIndex === -1) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    // Get active offer and calculate discounted price
    const { getActiveOfferForProduct, calculateDiscount } = require('../../utils/offer-helper');
    const offer = await getActiveOfferForProduct(product._id, product.category, product.regularPrice);
    const { finalPrice } = calculateDiscount(offer, product.regularPrice);

    // Get or create cart
    let cart = await Cart.findOne({ user: userId });
    let existingQuantity = 0;
    const MAX_QUANTITY_PER_PRODUCT = 5;

    if (cart) {
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );
      if (itemIndex > -1) {
        existingQuantity = cart.items[itemIndex].quantity;
      }
    }

    // Calculate total quantity
    const totalQuantity = existingQuantity + parseInt(quantity);

    // Check quantity limit
    if (totalQuantity > MAX_QUANTITY_PER_PRODUCT) {
      const remainingAllowed = MAX_QUANTITY_PER_PRODUCT - existingQuantity;
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: remainingAllowed > 0
          ? `You can only add ${remainingAllowed} more of this item. Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product.`
          : `Maximum quantity reached! You can only have up to ${MAX_QUANTITY_PER_PRODUCT} of this item in your cart.`,
        isQuantityLimitReached: true
      });
    }

    // Check stock
    if (totalQuantity > product.stock) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `Cannot add ${quantity} more items. Only ${product.stock - existingQuantity} items left in stock.`
      });
    }

    // Add to cart
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{
          product: productId,
          quantity: parseInt(quantity),
          priceAtAddition: finalPrice
        }],
        totalAmount: parseInt(quantity) * finalPrice
      });
    } else {
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = totalQuantity;
        cart.items[itemIndex].priceAtAddition = finalPrice;
      } else {
        cart.items.push({
          product: productId,
          quantity: parseInt(quantity),
          priceAtAddition: finalPrice
        });
      }

      cart.totalAmount = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.priceAtAddition,
        0
      );
    }

    await cart.save();

    // Remove item from wishlist after successful cart addition
    wishlist.items.splice(wishlistItemIndex, 1);
    await wishlist.save();

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const wishlistCount = wishlist.items.length;

    res.json({
      success: true,
      message: 'Item moved to cart successfully',
      cartCount,
      wishlistCount,
      removedFromWishlist: true
    });

  } catch (error) {
    console.log('Error adding to cart from wishlist:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error'
    });
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