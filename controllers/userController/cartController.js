const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema');
const {
  getActiveOfferForProduct,
  calculateDiscount,
} = require('../../utils/offerHelper');
const { HttpStatus } = require('../../helpers/statusCode');
const { calculateTotalWithGST, getCurrentGSTRate, getGSTPercentageString } = require('../../config/taxConfig');
const getCart = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/login');
    }
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      populate: {
        path: 'category',
        match: { isListed: true }
      }
    });
    const wishlist = await Wishlist.findOne({ user: userId });
    let cartItems = [];
    let totalAmount = 0;
    let totalDiscount = 0;
    let cartCount = 0;
    let wishlistCount = 0;
    let specialOfferDiscount = 0;
    let regularOfferDiscount = 0;
    let offerBreakdown = [];
    if (cart && cart.items.length > 0) {
      cartItems = cart.items.filter(
        (item) => item.product &&
                  item.product.isListed &&
                  item.product.category &&
                  item.product.category.isListed
      );
      for (const item of cartItems) {
        const originalPrice = item.product.regularPrice;
        const currentPrice = item.priceAtAddition || item.product.regularPrice;
        
        const offer = await getActiveOfferForProduct(
          item.product._id,
          item.product.category,
          originalPrice
        );
        const { discountPercentage, discountAmount, finalPrice } =
          calculateDiscount(offer, originalPrice);

        item.originalPrice = originalPrice;
        item.discountedPrice = currentPrice;
        item.offerDiscount = (originalPrice - currentPrice) * item.quantity;

        item.product.activeOffer = offer;
        item.product.discountPercentage = discountPercentage;
        item.product.discountAmount = discountAmount;
        item.product.finalPrice = finalPrice;
        item.product.regularPrice = originalPrice;
        item.product.salePrice = currentPrice;

        totalAmount += item.quantity * currentPrice;

        const itemTotalDiscount = item.quantity * (originalPrice - currentPrice);
        totalDiscount += itemTotalDiscount;

        if (offer && itemTotalDiscount > 0) {
          if (offer.isSpecialOffer) {
            specialOfferDiscount += itemTotalDiscount;
          } else {
            regularOfferDiscount += itemTotalDiscount;
          }

          const existingOffer = offerBreakdown.find(o => o.title === offer.title);
          if (existingOffer) {
            existingOffer.discount += itemTotalDiscount;
          } else {
            offerBreakdown.push({
              title: offer.title,
              discount: itemTotalDiscount,
              isSpecialOffer: offer.isSpecialOffer || false
            });
          }
        }
      }
      cartCount = cartItems.length;
    }
    if (wishlist) {
      wishlistCount = wishlist.items.length;
    }
    const relatedProducts = await Product.aggregate([
      { $match: { isListed: true, isDeleted: false } },
      { $sample: { size: 4 } },
    ]);
    for (const product of relatedProducts) {
      const offer = await getActiveOfferForProduct(
        product._id,
        product.category,
        product.regularPrice
      );
      const { discountPercentage, discountAmount, finalPrice } =
        calculateDiscount(offer, product.regularPrice);
      product.activeOffer = offer;
      product.discountPercentage = discountPercentage;
      product.discountAmount = discountAmount;
      product.finalPrice = finalPrice;
      product.regularPrice = product.regularPrice || product.salePrice;
      product.salePrice = finalPrice;
    }
    const taxCalculation = calculateTotalWithGST(totalAmount);



    res.render('cart', {
      cartItems,
      totalAmount: totalAmount.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      specialOfferDiscount: specialOfferDiscount.toFixed(2),
      regularOfferDiscount: regularOfferDiscount.toFixed(2),
      offerBreakdown,
      relatedProducts,
      cartCount,
      wishlistCount,
      user: userId ? { id: userId } : null,
      isAuthenticated: true,
      subtotalBeforeGST: taxCalculation.subtotal,
      gstAmount: taxCalculation.gst,
      gstPercentage: taxCalculation.gstPercentage,
      finalTotal: taxCalculation.total,
      gstRate: getCurrentGSTRate()
    });
  } catch (error) {
    console.error('Error in rendering cart:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};
const addToCart = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({
          success: false,
          message: 'Please log in to add items to your cart',
          requiresAuth: true,
          redirectTo: '/login'
        });
    }
    const userId = req.session.user_id;
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId).populate('category');
    if (!product || !product.isListed || product.isDeleted || !product.category || !product.category.isListed) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Product not found or unavailable' });
    }
    const offer = await getActiveOfferForProduct(product._id, product.category);
    const { finalPrice } = calculateDiscount(offer, product.regularPrice);
    let cart = await Cart.findOne({ user: userId });
    let existingQuantity = 0;
    const MAX_QUANTITY_PER_PRODUCT = 5;
    if (cart) {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );
      if (itemIndex > -1) {
        existingQuantity = cart.items[itemIndex].quantity;
      }
    }
    const totalQuantity = existingQuantity + parseInt(quantity);
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
    if (totalQuantity > product.stock) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `Cannot add ${quantity} more items. Only ${
          product.stock - existingQuantity
        } items left in stock.`,
      });
    }
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [
          {
            product: productId,
            quantity: parseInt(quantity),
            priceAtAddition: finalPrice,
          },
        ],
        totalAmount: parseInt(quantity) * finalPrice,
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = totalQuantity;
        cart.items[itemIndex].priceAtAddition = finalPrice;
      } else {
        cart.items.push({
          product: productId,
          quantity: parseInt(quantity),
          priceAtAddition: finalPrice,
        });
      }
      cart.totalAmount = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.priceAtAddition,
        0
      );
    }
    await cart.save();
    const cartCount = cart.items.length;
    res.json({ success: true, message: 'Added to cart', cartCount });
  } catch (error) {
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Server error' });
  }
};
const updateCartItem = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ success: false, message: 'Please log in' });
    }
    const userId = req.session.user_id;
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Cart not found' });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex === -1) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Item not found in cart' });
    }
    const product = await Product.findById(productId);
    if (!product || !product.isListed || product.isDeleted) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Product not found or unavailable' });
    }
    const MAX_QUANTITY_PER_PRODUCT = 5;
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({
          success: false,
          message: `Maximum quantity reached! You can only have up to ${MAX_QUANTITY_PER_PRODUCT} of this item in your cart.`,
          isQuantityLimitReached: true
        });
    }
    if (quantity > product.stock) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({
          success: false,
          message: `Only ${product.stock} items in stock`,
        });
    }
    const offer = await getActiveOfferForProduct(product._id, product.category);
    const { finalPrice } = calculateDiscount(offer, product.regularPrice);
    cart.items[itemIndex].quantity = parseInt(quantity);
    cart.items[itemIndex].priceAtAddition = finalPrice;
    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.priceAtAddition,
      0
    );
    await cart.save();
    res.json({
      success: true,
      message: 'Cart updated',
      totalAmount: cart.totalAmount,
      itemTotal:
        cart.items[itemIndex].quantity * cart.items[itemIndex].priceAtAddition,
      cartCount: cart.items.length,
    });
  } catch (error) {
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Server error' });
  }
};
const removeCartItem = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ success: false, message: 'Please log in' });
    }
    const userId = req.session.user_id;
    const { productId } = req.body;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Cart not found' });
    }
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.priceAtAddition,
      0
    );
    await cart.save();
    const cartCount = cart.items.length;
    res.json({
      success: true,
      message: 'Item removed',
      cartCount,
      totalAmount: cart.totalAmount,
    });
  } catch {
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Server error' });
  }
};
const clearCart = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ success: false, message: 'Please log in' });
    }
    const userId = req.session.user_id;
    await Cart.findOneAndDelete({ user: userId });
    res.json({
      success: true,
      message: 'Cart cleared',
      cartCount: 0,
      totalAmount: 0,
    });
  } catch {
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Server error' });
  }
};
module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};