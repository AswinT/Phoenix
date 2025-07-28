require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const {
  getActiveOfferForProduct,
  calculateDiscount,
  calculateProportionalCouponDiscount,
  getItemPriceDetails,
  calculateFinalItemPrice
} = require('../../utils/offerHelper');
const { HttpStatus } = require('../../helpers/statusCode');
const getInitialPaymentStatus = (paymentMethod) => {
  switch (paymentMethod) {
  case 'Wallet':
    return 'Paid';
  case 'COD':
    return 'Pending';
  case 'Razorpay':
    return 'Pending';
  default:
    return 'Pending';
  }
};
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `ORD-${timestamp}-${random}`;
};
const getCheckout = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect('/login');
    }
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !cart.items || cart.items.length === 0) {
      req.session.errorMessage = 'Your cart is empty. Please add items before checkout.';
      return res.redirect('/cart');
    }
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1 });

    // Enhanced stock validation with detailed conflict detection
    const validItems = [];
    const stockConflicts = [];
    const unavailableItems = [];

    for (const item of cart.items) {
      if (!item.product || !item.product.isListed || item.product.isDeleted) {
        unavailableItems.push({
          productId: item.product?._id,
          model: item.product?.model || 'Unknown Product',
          reason: 'Product no longer available'
        });
        continue;
      }

      if (item.product.stock < item.quantity) {
        stockConflicts.push({
          productId: item.product._id,
          model: item.product.model,
          requestedQuantity: item.quantity,
          availableStock: item.product.stock,
          priceAtAddition: item.priceAtAddition
        });
        continue;
      }

      validItems.push(item);
    }

    // Handle unavailable items by removing them
    if (unavailableItems.length > 0) {
      cart.items = validItems.concat(stockConflicts.map(conflict =>
        cart.items.find(item => item.product._id.toString() === conflict.productId.toString())
      ));
      await cart.save();
      req.session.errorMessage = 'Some items were removed from your cart as they are no longer available.';
      return res.redirect('/cart');
    }

    // If there are stock conflicts, handle them specially
    if (stockConflicts.length > 0) {
      // Store stock conflicts in session for the checkout page to display
      req.session.stockConflicts = stockConflicts;



      // Set error message for stock conflicts
      const conflictMessages = stockConflicts.map(conflict =>
        `${conflict.model}: requested ${conflict.requestedQuantity}, only ${conflict.availableStock} available`
      );
      req.session.errorMessage = `Some items in your cart exceed available stock: ${conflictMessages.join('; ')}. Please adjust quantities before proceeding.`;
    } else {
      // Clear any previous stock conflicts
      delete req.session.stockConflicts;
    }

    const cartItems = stockConflicts.length > 0 ?
      validItems.concat(stockConflicts.map(conflict =>
        cart.items.find(item => item.product._id.toString() === conflict.productId.toString())
      )) : validItems;

    if (cartItems.length === 0) {
      req.session.errorMessage = 'No valid items in cart. Some items may be unavailable or out of stock.';
      return res.redirect('/cart');
    }
    let subtotal = 0;
    let tax = 0;
    let totalAmount = 0;
    let cartCount = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let appliedCoupon = null;
    const itemDetails = {};
    for (const item of cartItems) {
      const offer = await getActiveOfferForProduct(
        item.product._id,
        item.product.category,
        item.priceAtAddition
      );
      if (offer) {
        const { discountAmount, discountPercentage, finalPrice } = calculateDiscount(offer, item.priceAtAddition);
        item.originalPrice = item.priceAtAddition;
        item.discountedPrice = finalPrice;
        item.offerDiscount = discountAmount * item.quantity;
        item.offerTitle = offer.title;
        item.discountPercentage = discountPercentage;
        offerDiscount += discountAmount * item.quantity;
      } else {
        item.originalPrice = item.priceAtAddition;
        item.discountedPrice = item.priceAtAddition;
        item.offerDiscount = 0;
        item.offerTitle = null;
        item.discountPercentage = 0;
      }
    }
    subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.discountedPrice, 0);
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findById(req.session.appliedCoupon);
      if (coupon && coupon.isActive && new Date() <= coupon.expiryDate) {
        if (subtotal >= coupon.minOrderAmount) {
          appliedCoupon = coupon;
          const couponResult = calculateProportionalCouponDiscount(coupon, cartItems);
          couponDiscount = couponResult.totalDiscount;
          cartItems.forEach(item => {
            const itemCouponInfo = couponResult.itemDiscounts[item.product._id.toString()];
            item.couponDiscount = itemCouponInfo ? itemCouponInfo.amount : 0;
            item.couponProportion = itemCouponInfo ? itemCouponInfo.proportion : 0;
            const itemTotal = item.discountedPrice * item.quantity;
            const itemCouponDiscount = itemCouponInfo ? itemCouponInfo.amount : 0;
            item.finalPrice = itemTotal - itemCouponDiscount;
            item.totalDiscount = item.offerDiscount + itemCouponDiscount;
            const originalTotal = item.originalPrice * item.quantity;
            item.discountPercentage = originalTotal > 0
              ? ((item.totalDiscount / originalTotal) * 100).toFixed(1)
              : '0.0';
            itemDetails[item.product._id.toString()] = {
              originalPrice: item.originalPrice,
              quantity: item.quantity,
              subtotal: originalTotal,
              offerDiscount: item.offerDiscount,
              priceAfterOffer: itemTotal,
              couponDiscount: itemCouponDiscount,
              finalPrice: item.finalPrice,
              couponProportion: itemCouponInfo ? itemCouponInfo.proportion : 0
            };
          });
        } else {
          delete req.session.appliedCoupon;
          appliedCoupon = null;
          req.session.errorMessage = `Minimum order amount of ₹${coupon.minOrderAmount} required for coupon ${coupon.code}`;
        }
      } else {
        delete req.session.appliedCoupon;
        appliedCoupon = null;
        if (coupon) {
          req.session.errorMessage = 'The applied coupon has expired or is no longer valid.';
        }
      }
    }
    if (!appliedCoupon) {
      cartItems.forEach(item => {
        const itemTotal = item.discountedPrice * item.quantity;
        item.finalPrice = itemTotal;
        item.totalDiscount = item.offerDiscount;
        item.discountPercentage = item.discountPercentage || 0;
        itemDetails[item.product._id.toString()] = {
          originalPrice: item.originalPrice,
          quantity: item.quantity,
          subtotal: item.originalPrice * item.quantity,
          offerDiscount: item.offerDiscount,
          priceAfterOffer: itemTotal,
          couponDiscount: 0,
          finalPrice: itemTotal,
          couponProportion: 0
        };
      });
    }
    tax = (subtotal - couponDiscount) * 0.08;
    totalAmount = subtotal - couponDiscount + tax;
    cartCount = cartItems.length;
    if (addresses.length === 0) {
      req.session.errorMessage = 'Please add a delivery address before proceeding to checkout.';
      return res.redirect('/address');
    }
    const availableCoupons = await getAvailableCouponsForUser(userId, subtotal);
    const isCodEligible = totalAmount <= 1000;
    const wallet = await Wallet.findOne({ userId });
    const walletBalance = wallet ? wallet.balance : 0;
    const isWalletEligible = walletBalance >= totalAmount;
    const originalSubtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.originalPrice, 0);
    res.render('checkout', {
      cartItems,
      subtotal,
      originalSubtotal,
      tax,
      totalAmount,
      cartCount,
      addresses,
      offerDiscount,
      couponDiscount,
      appliedCoupon,
      availableCoupons: availableCoupons || [],
      itemDetails,
      user: userId ? { id: userId } : null,
      isAuthenticated: true,
      currentStep: req.query.step ? parseInt(req.query.step) : 1,
      selectedAddressId: req.query.address || '',
      paymentMethod: req.query.paymentMethod || '',
      shippingCost: 0,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      isCodEligible,
      walletBalance,
      isWalletEligible,
      stockConflicts: req.session.stockConflicts || [],
      hasStockConflicts: (req.session.stockConflicts || []).length > 0,
      errorMessage: req.session.errorMessage,
      successMessage: req.session.successMessage
    });
    delete req.session.errorMessage;
    delete req.session.successMessage;
    // Keep stockConflicts in session for potential API calls, but clear after successful resolution
  } catch (error) {
    console.error('Error in rendering checkout page:', error);
    req.session.errorMessage = 'Something went wrong. Please try again.';
    return res.redirect('/cart');
  }
};
async function getAvailableCouponsForUser(userId, orderAmount) {
  try {
    console.log('Fetching coupons for:', {
      userId,
      orderAmount
    });
    const allCoupons = await Coupon.find({
      isActive: true,
      minOrderAmount: { $lte: orderAmount }
    }).lean();
    console.log('All active coupons found:', allCoupons.length);
    const availableCoupons = allCoupons
      .filter((coupon) => {
        if (coupon.usageLimitGlobal && coupon.usedCount >= coupon.usageLimitGlobal) {
          console.log(`Coupon ${coupon.code} excluded: Global limit reached (${coupon.usedCount}/${coupon.usageLimitGlobal})`);
          return false;
        }
        const userUsage = coupon.usedBy.find((usage) => usage.userId.toString() === userId.toString());
        if (userUsage && userUsage.count >= coupon.usageLimitPerUser) {
          console.log(`Coupon ${coupon.code} excluded: User limit reached (${userUsage.count}/${coupon.usageLimitPerUser})`);
          return false;
        }
        return true;
      })
      .map((coupon) => ({
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountValue: coupon.maxDiscountValue,
        minOrderAmount: coupon.minOrderAmount,
        discountDisplay: coupon.discountType === 'percentage'
          ? `${coupon.discountValue}% OFF${coupon.maxDiscountValue ? ` (up to ₹${coupon.maxDiscountValue})` : ''}`
          : `₹${coupon.discountValue} OFF`,
        validUntil: new Date(coupon.expiryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }));
    console.log('Final available coupons:', availableCoupons.map(c => ({
      code: c.code,
      discount: c.discountDisplay,
      minOrder: c.minOrderAmount
    })));
    return availableCoupons;
  } catch (error) {
    console.error('Error fetching available coupons:', error);
    return [];
  }
}
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in to apply a coupon' });
    }
    // Validate and sanitize coupon code
    if (!couponCode || typeof couponCode !== 'string') {
      return res.status(400).json({ success: false, message: 'Please enter a valid coupon code' });
    }
    const sanitizedCouponCode = couponCode.trim().toUpperCase();
    if (!sanitizedCouponCode) {
      return res.status(400).json({ success: false, message: 'Please enter a valid coupon code' });
    }
    const coupon = await Coupon.findOne({ code: sanitizedCouponCode });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: 'This coupon is inactive' });
    }
    const now = new Date();
    if (now < coupon.startDate || now > coupon.expiryDate) {
      return res.status(400).json({ success: false, message: 'This coupon has expired or is not yet active' });
    }
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }
    const cartItems = cart.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted);
    for (const item of cartItems) {
      const offer = await getActiveOfferForProduct(item.product._id, item.product.category);
      if (offer) {
        const { finalPrice } = calculateDiscount(offer, item.priceAtAddition);
        item.discountedPrice = finalPrice;
      } else {
        item.discountedPrice = item.priceAtAddition;
      }
    }
    const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.discountedPrice, 0);
    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      });
    }
    if (coupon.usageLimitGlobal && coupon.usedCount >= coupon.usageLimitGlobal) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
    }
    const userUsage = coupon.usedBy.find((usage) => usage.userId.toString() === userId.toString());
    if (userUsage && userUsage.count >= coupon.usageLimitPerUser) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon the maximum number of times'
      });
    }
    const couponResult = calculateProportionalCouponDiscount(coupon, cartItems);
    const discount = couponResult.totalDiscount;
    req.session.appliedCoupon = coupon._id;
    const itemDetails = {};
    cartItems.forEach(item => {
      const itemCouponInfo = couponResult.itemDiscounts[item.product._id.toString()];
      const details = getItemPriceDetails(item, itemCouponInfo);
      itemDetails[item.product._id.toString()] = details;
    });
    const tax = (subtotal - discount) * 0.08;
    const total = subtotal - discount + tax;
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Coupon applied successfully',
      discount,
      itemDetails,
      tax,
      total,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
  }
};
const removeCoupon = async (req, res) => {
  try {
    delete req.session.appliedCoupon;
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Coupon removed successfully',
    });
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
  }
};
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in to add an address' });
    }
    const { fullName, phone, pincode, district, state, street, landmark, isDefault } = req.body;
    if (!fullName || !phone || !pincode || !district || !state || !street) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'All required fields must be filled' });
    }
    const newAddress = new Address({
      userId,
      fullName,
      phone,
      pincode,
      district,
      state,
      street,
      landmark,
      isDefault: isDefault || false,
    });
    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }
    await newAddress.save();
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Address added successfully',
      address: newAddress,
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
  }
};
const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in to place an order' });
    }
    const { addressId } = req.body;
    if (!addressId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Address is required' });
    }
    const address = await Address.findById(addressId);
    if (!address || address.userId.toString() !== userId.toString()) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Invalid or unauthorized address' });
    }
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !cart.items.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Cart is empty' });
    }
    const cartItems = cart.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted);
    if (!cartItems.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'No valid items in cart' });
    }
    const orderNumber = generateOrderNumber();
    const orderItems = [];
    let originalSubtotal = 0;
    let subtotalAfterOffers = 0;
    let totalOfferDiscount = 0;
    for (const item of cartItems) {
      const originalItemTotal = item.priceAtAddition * item.quantity;
      originalSubtotal += originalItemTotal;
      const offer = await getActiveOfferForProduct(
        item.product._id,
        item.product.category,
        item.priceAtAddition
      );
      if (offer) {
        const { discountAmount, finalPrice } = calculateDiscount(offer, item.priceAtAddition);
        const itemDiscount = discountAmount * item.quantity;
        const itemTotalAfterOffer = finalPrice * item.quantity;
        totalOfferDiscount += itemDiscount;
        subtotalAfterOffers += itemTotalAfterOffer;
        const orderItem = {
          product: item.product._id,
          model: item.product.model,
          image: item.product.mainImage,
          price: item.priceAtAddition,
          discountedPrice: finalPrice,
          quantity: item.quantity,
          offerDiscount: itemDiscount,
          offerTitle: offer.title,
          priceBreakdown: {
            originalPrice: item.priceAtAddition,
            subtotal: originalItemTotal,
            offerDiscount: itemDiscount,
            offerTitle: offer.title,
            priceAfterOffer: itemTotalAfterOffer,
            couponDiscount: 0,
            couponProportion: 0,
            finalPrice: itemTotalAfterOffer
          }
        };
        orderItems.push(orderItem);
      } else {
        subtotalAfterOffers += originalItemTotal;
        const orderItem = {
          product: item.product._id,
          model: item.product.model,
          image: item.product.mainImage,
          price: item.priceAtAddition,
          discountedPrice: item.priceAtAddition,
          quantity: item.quantity,
          offerDiscount: 0,
          offerTitle: null,
          priceBreakdown: {
            originalPrice: item.priceAtAddition,
            subtotal: originalItemTotal,
            offerDiscount: 0,
            offerTitle: null,
            priceAfterOffer: originalItemTotal,
            couponDiscount: 0,
            couponProportion: 0,
            finalPrice: originalItemTotal
          }
        };
        orderItems.push(orderItem);
      }
    }
    const checkoutSubtotal = originalSubtotal;
    const checkoutOfferDiscount = totalOfferDiscount;
    let couponDiscount = 0;
    let appliedCouponCode = null;
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findById(req.session.appliedCoupon);
      if (coupon && coupon.isActive && new Date() <= coupon.expiryDate) {
        const amountAfterOffers = subtotalAfterOffers;
        if (amountAfterOffers >= coupon.minOrderAmount) {
          const couponResult = calculateProportionalCouponDiscount(coupon, orderItems);
          couponDiscount = couponResult.totalDiscount;
          appliedCouponCode = coupon.code;
          orderItems.forEach(item => {
            const itemCouponInfo = couponResult.itemDiscounts[item.product.toString()];
            if (itemCouponInfo) {
              item.couponDiscount = itemCouponInfo.amount;
              item.couponProportion = itemCouponInfo.proportion;
              item.priceBreakdown.couponDiscount = itemCouponInfo.amount;
              item.priceBreakdown.couponProportion = itemCouponInfo.proportion;
              item.priceBreakdown.finalPrice = item.priceBreakdown.priceAfterOffer - itemCouponInfo.amount;
              const finalPriceDetails = calculateFinalItemPrice(item, { couponDiscount });
              item.finalPrice = finalPriceDetails.finalPrice / item.quantity;
            }
          });
        }
      }
    }
    const amountAfterAllDiscounts = subtotalAfterOffers - couponDiscount;
    const checkoutTax = Math.round(amountAfterAllDiscounts * 0.08 * 100) / 100;
    let checkoutTotal = Math.round((amountAfterAllDiscounts + checkoutTax) * 100) / 100;

    const itemFinalPriceSum = orderItems.reduce((sum, item) => sum + (item.priceBreakdown?.finalPrice || 0), 0);
    const expectedTotal = itemFinalPriceSum + checkoutTax;
    if (Math.abs(expectedTotal - checkoutTotal) > 0.01) {
      console.error('Order total inconsistency detected:', {
        itemFinalPriceSum: itemFinalPriceSum.toFixed(2),
        calculatedTax: checkoutTax.toFixed(2),
        expectedTotal: expectedTotal.toFixed(2),
        actualTotal: checkoutTotal.toFixed(2),
        difference: (checkoutTotal - expectedTotal).toFixed(2)
      });
      checkoutTotal = expectedTotal;
    }
    const displayBreakdown = [
      `Subtotal: ₹${checkoutSubtotal.toFixed(2)}`,
      `Offer Discount: -₹${checkoutOfferDiscount.toFixed(2)}`,
      appliedCouponCode ? `Coupon (${appliedCouponCode}): -₹${couponDiscount.toFixed(2)}` : null,
      `Tax (8%): ₹${checkoutTax.toFixed(2)}`,
      `Final Amount: ₹${checkoutTotal.toFixed(2)}`
    ].filter(Boolean).join('\n');
    req.session.pendingOrder = {
      orderNumber: orderNumber,
      addressId,
      orderItems,
      subtotal: checkoutSubtotal,
      tax: checkoutTax,
      offerDiscount: checkoutOfferDiscount,
      couponDiscount,
      couponCode: appliedCouponCode,
      total: checkoutTotal,
      paymentMethod: 'Razorpay'
    };
    const amountInPaise = Math.round(checkoutTotal * 100);
    const razorpayOrderData = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        subtotal: checkoutSubtotal.toFixed(2),
        offerDiscount: checkoutOfferDiscount.toFixed(2),
        tax: checkoutTax.toFixed(2),
        total: checkoutTotal.toFixed(2)
      }
    };
    const razorpayOrder = await razorpay.orders.create(razorpayOrderData);
    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Phoenix',
      description: `Order Total: ₹${checkoutTotal.toFixed(2)}`,
      prefill: {
        name: address.fullName,
        contact: address.phone,
      },
      theme: {
        color: '#198754'
      },
      notes: {
        orderNumber: orderNumber,
        breakdown: displayBreakdown
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    const pendingOrder = req.session.pendingOrder;
    if (!pendingOrder) {
      return res.status(400).json({ success: false, message: 'No pending order found' });
    }
    const userId = req.session.user_id;
    const stockUpdates = [];
    for (const item of pendingOrder.orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product ${item.model} not found`);
      }
      const newStock = product.stock - item.quantity;
      if (newStock < 0) {
        throw new Error(`Insufficient stock for ${item.model}. Only ${product.stock} items available.`);
      }
      stockUpdates.push({ productId: item.product, originalStock: product.stock, newStock });
    }
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(update.productId, { stock: update.newStock }, { new: true });
    }
    const address = await Address.findById(pendingOrder.addressId);
    const orderItems = pendingOrder.orderItems.map(item => ({
      ...item,
      priceBreakdown: {
        originalPrice: item.price,
        subtotal: item.price * item.quantity,
        offerDiscount: item.offerDiscount || 0,
        offerTitle: item.offerTitle,
        priceAfterOffer: item.discountedPrice * item.quantity,
        couponDiscount: item.couponDiscount || 0,
        couponProportion: item.couponProportion || 0,
        finalPrice: (item.discountedPrice * item.quantity) - (item.couponDiscount || 0)
      },
      status: 'Active'
    }));
    const order = new Order({
      user: userId,
      orderNumber: pendingOrder.orderNumber,
      items: orderItems,
      shippingAddress: {
        userId: address.userId,
        fullName: address.fullName,
        phone: address.phone,
        pincode: address.pincode,
        district: address.district,
        state: address.state,
        street: address.street,
        landmark: address.landmark,
        isDefault: address.isDefault,
      },
      paymentMethod: 'Razorpay',
      paymentStatus: 'Paid',
      orderStatus: 'Placed',
      subtotal: pendingOrder.subtotal,
      shipping: 0,
      tax: pendingOrder.tax,
      discount: pendingOrder.offerDiscount,
      couponCode: pendingOrder.couponCode,
      couponDiscount: pendingOrder.couponDiscount,
      total: pendingOrder.total,
      createdAt: new Date(),
      updatedAt: new Date(),
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });
    await order.save();
    if (pendingOrder.couponCode) {
      const coupon = await Coupon.findOne({ code: pendingOrder.couponCode });
      if (coupon) {
        coupon.usedCount += 1;
        const userUsageIndex = coupon.usedBy.findIndex((usage) => usage.userId.toString() === userId.toString());
        if (userUsageIndex >= 0) {
          coupon.usedBy[userUsageIndex].count += 1;
          coupon.usedBy[userUsageIndex].usedAt = new Date();
        } else {
          coupon.usedBy.push({
            userId,
            usedAt: new Date(),
            count: 1,
          });
        }
        await coupon.save();
      }
    }
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    delete req.session.pendingOrder;
    delete req.session.appliedCoupon;
    res.status(200).json({
      success: true,
      message: 'Payment successful',
      orderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id, error_code, error_description } = req.body;
    console.log('Payment failure details:', {
      razorpay_order_id,
      error_code,
      error_description
    });
    const pendingOrder = req.session.pendingOrder;
    if (pendingOrder) {
      const userId = req.session.user_id;
      if (userId) {
        try {
          const address = await Address.findById(pendingOrder.addressId);
          if (address) {
            const pendingPaymentOrder = new Order({
              user: userId,
              orderNumber: pendingOrder.orderNumber,
              items: pendingOrder.orderItems.map(item => ({
                ...item,
                status: 'Active'
              })),
              shippingAddress: {
                userId: address.userId,
                fullName: address.fullName,
                phone: address.phone,
                pincode: address.pincode,
                district: address.district,
                state: address.state,
                street: address.street,
                landmark: address.landmark,
                isDefault: address.isDefault,
              },
              paymentMethod: 'Razorpay',
              paymentStatus: 'Pending Payment',
              orderStatus: 'Pending Payment',
              subtotal: pendingOrder.subtotal,
              shipping: 0,
              tax: pendingOrder.tax,
              discount: pendingOrder.offerDiscount,
              couponCode: pendingOrder.couponCode,
              couponDiscount: pendingOrder.couponDiscount,
              total: pendingOrder.total,
              createdAt: new Date(),
              updatedAt: new Date(),
              originalRazorpayOrderId: razorpay_order_id,
              paymentRetryAttempts: 1,
              lastPaymentAttempt: new Date(),
              paymentFailureReason: error_description || 'Payment failed'
            });
            await pendingPaymentOrder.save();
            console.log('Pending payment order created:', pendingPaymentOrder.orderNumber);
            return res.status(200).json({
              success: false,
              message: 'Payment failed. Your order has been saved and you can retry payment anytime.',
              error_code: error_code,
              orderId: pendingPaymentOrder._id,
              orderNumber: pendingPaymentOrder.orderNumber,
              canRetry: true,
              redirectUrl: `/orders/${pendingPaymentOrder._id}`
            });
          }
        } catch (orderError) {
          console.error('Error creating pending payment order:', orderError);
        }
      }
    }
    delete req.session.pendingOrder;
    delete req.session.appliedCoupon;
    res.status(200).json({
      success: false,
      message: error_description || 'Payment failed. Please try again.',
      error_code: error_code,
      redirectUrl: '/orders'
    });
  } catch (error) {
    console.error('Error handling payment failure:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      redirectUrl: '/orders'
    });
  }
};
const placeOrder = async (req, res) => {
  const stockUpdates = [];
  let wallet = null;
  let total = 0;
  let appliedCoupon = null;
  const userId = req.session.user_id;

  try {
    if (!userId) {
      throw new Error('Please log in to place an order');
    }
    const { addressId, paymentMethod } = req.body;
    if (!addressId || !paymentMethod) {
      throw new Error('Address and payment method are required');
    }
    if (!['COD', 'Wallet', 'Razorpay'].includes(paymentMethod)) {
      throw new Error('Only COD, Wallet, and Razorpay payments are supported');
    }
    const address = await Address.findById(addressId);
    if (!address) {
      throw new Error('Selected address not found');
    }
    if (address.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized access to address');
    }
    if (!address.fullName || address.fullName.trim().length < 3) {
      throw new Error('Invalid address: Full name is required and must be at least 3 characters');
    }
    if (!address.phone || !/^\d{10}$/.test(address.phone.replace(/\D/g, ''))) {
      throw new Error('Invalid address: Valid 10-digit phone number is required');
    }
    if (!address.pincode || !/^\d{6}$/.test(address.pincode)) {
      throw new Error('Invalid address: Valid 6-digit pincode is required');
    }
    if (!address.district || address.district.trim().length < 3) {
      throw new Error('Invalid address: District is required');
    }
    if (!address.state || address.state.trim().length < 3) {
      throw new Error('Invalid address: State is required');
    }
    if (!address.street || address.street.trim().length < 10) {
      throw new Error('Invalid address: Complete street address is required (minimum 10 characters)');
    }
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !cart.items.length) {
      throw new Error('Cart is empty');
    }
    const cartItems = cart.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted);
    if (!cartItems.length) {
      throw new Error('No valid items in cart');
    }
    let subtotal = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    const orderItems = [];
    for (const item of cartItems) {
      const offer = await getActiveOfferForProduct(item.product._id, item.product.category, item.priceAtAddition);
      let itemPrice = item.priceAtAddition;
      let itemDiscount = 0;
      let offerTitle = null;
      if (offer) {
        const { discountAmount, finalPrice } = calculateDiscount(offer, item.priceAtAddition);
        itemPrice = finalPrice;
        itemDiscount = discountAmount * item.quantity;
        offerTitle = offer.title;
        offerDiscount += itemDiscount;
      }
      const orderItem = {
        product: item.product._id,
        model: item.product.model,
        image: item.product.mainImage,
        price: item.priceAtAddition,
        discountedPrice: itemPrice,
        quantity: item.quantity,
        offerDiscount: itemDiscount,
        offerTitle: offerTitle,
        priceBreakdown: {
          originalPrice: item.priceAtAddition,
          subtotal: item.priceAtAddition * item.quantity,
          offerDiscount: itemDiscount,
          offerTitle: offerTitle,
          priceAfterOffer: itemPrice * item.quantity,
          couponDiscount: 0,
          couponProportion: 0,
          finalPrice: itemPrice * item.quantity
        }
      };
      orderItems.push(orderItem);
      subtotal += itemPrice * item.quantity;
    }
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findById(req.session.appliedCoupon);
      if (!coupon) {
        throw new Error('Applied coupon not found');
      }
      if (!coupon.isActive) {
        throw new Error('Applied coupon is inactive');
      }
      const now = new Date();
      if (now < coupon.startDate || now > coupon.expiryDate) {
        throw new Error('Applied coupon has expired or is not yet active');
      }
      if (subtotal < coupon.minOrderAmount) {
        throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required for coupon ${coupon.code}`);
      }
      if (coupon.usageLimitGlobal && coupon.usedCount >= coupon.usageLimitGlobal) {
        throw new Error('Coupon has reached its global usage limit');
      }
      const userUsage = coupon.usedBy.find((usage) => usage.userId.toString() === userId.toString());
      if (userUsage && userUsage.count >= coupon.usageLimitPerUser) {
        throw new Error('You have already used this coupon the maximum number of times');
      }
      appliedCoupon = coupon;
      const couponResult = calculateProportionalCouponDiscount(coupon, orderItems);
      couponDiscount = couponResult.totalDiscount;
      orderItems.forEach(item => {
        const itemCouponInfo = couponResult.itemDiscounts[item.product.toString()];
        if (itemCouponInfo) {
          item.couponDiscount = itemCouponInfo.amount;
          item.couponProportion = itemCouponInfo.proportion;
          item.priceBreakdown.couponDiscount = itemCouponInfo.amount;
          item.priceBreakdown.couponProportion = itemCouponInfo.proportion;
          item.priceBreakdown.finalPrice = item.priceBreakdown.priceAfterOffer - itemCouponInfo.amount;
          const finalPriceDetails = calculateFinalItemPrice(item, { couponDiscount });
          item.finalPrice = finalPriceDetails.finalPrice / item.quantity;
        }
      });
      coupon.usedCount += 1;
      const userUsageIndex = coupon.usedBy.findIndex((usage) => usage.userId.toString() === userId.toString());
      if (userUsageIndex >= 0) {
        coupon.usedBy[userUsageIndex].count += 1;
        coupon.usedBy[userUsageIndex].usedAt = new Date();
      } else {
        coupon.usedBy.push({
          userId,
          usedAt: new Date(),
          count: 1,
        });
      }
      await coupon.save();
      delete req.session.appliedCoupon;
    }
    const tax = (subtotal - offerDiscount - couponDiscount) * 0.08;
    total = subtotal - offerDiscount - couponDiscount + tax;
    if (paymentMethod === 'COD' && total > 1000) {
      throw new Error('Cash on Delivery is not available for orders above ₹1,000. Please choose an online payment method.');
    }
    if (paymentMethod === 'Wallet') {
      wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found. Wallet balance is credited through refunds and referral bonuses.');
      }
      if (wallet.balance < total) {
        throw new Error(`Insufficient wallet balance. You need ₹${(total - wallet.balance).toFixed(2)} more to complete this order.`);
      }
    }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of orderItems) {
          const product = await Product.findById(item.product).session(session);
          if (!product) {
            throw new Error(`Product ${item.model} not found`);
          }
          if (!product.isListed || product.isDeleted) {
            throw new Error(`Product ${item.model} is no longer available`);
          }
          const newStock = product.stock - item.quantity;
          if (newStock < 0) {
            throw new Error(`Insufficient stock for ${item.model}. Only ${product.stock} items available.`);
          }
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: item.product,
              stock: product.stock
            },
            {
              stock: newStock,
              updatedAt: new Date()
            },
            {
              new: true,
              session: session
            }
          );
          if (!updateResult) {
            throw new Error(`Stock for ${item.model} was updated by another transaction. Please try again.`);
          }
          stockUpdates.push({
            productId: item.product,
            originalStock: product.stock,
            newStock: newStock,
            productModel: item.model
          });
        }
      });
    } catch (error) {
      await session.endSession();
      throw error;
    }
    await session.endSession();
    const order = new Order({
      user: userId,
      orderNumber: generateOrderNumber(),
      items: orderItems,
      shippingAddress: {
        userId: address.userId,
        fullName: address.fullName,
        phone: address.phone,
        pincode: address.pincode,
        district: address.district,
        state: address.state,
        street: address.street,
        landmark: address.landmark,
        isDefault: address.isDefault,
      },
      paymentMethod: paymentMethod,
      paymentStatus: getInitialPaymentStatus(paymentMethod),
      orderStatus: 'Placed',
      subtotal,
      shipping: 0,
      tax,
      discount: offerDiscount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDiscount,
      total,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await order.save();
    if (paymentMethod === 'Wallet' && wallet) {
      try {
        wallet.balance = Number(wallet.balance) - Number(total);
        wallet.transactions.push({
          type: 'debit',
          amount: Number(total),
          orderId: order._id,
          reason: `Payment for order #${order.orderNumber}`,
          date: new Date()
        });
        await wallet.save();
        console.log(`Wallet payment processed: ₹${total} deducted from user ${userId} wallet`);
      } catch (walletError) {
        console.error('Error processing wallet payment:', walletError);
        await Order.findByIdAndDelete(order._id);
        for (const update of stockUpdates) {
          await Product.findByIdAndUpdate(update.productId, { stock: update.originalStock }, { new: true });
        }
        throw new Error('Failed to process wallet payment. Please try again.');
      }
    }
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: paymentMethod === 'Wallet' ? 'Order placed and paid successfully from wallet' : 'Order placed successfully',
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    try {
      if (stockUpdates && stockUpdates.length > 0) {
        for (const update of stockUpdates) {
          await Product.findByIdAndUpdate(
            update.productId,
            { stock: update.originalStock },
            { new: true }
          );
        }
      }
      if (error.walletDeducted && wallet) {
        wallet.balance = Number(wallet.balance) + Number(total);
        wallet.transactions = wallet.transactions.filter(
          transaction => !transaction.orderId || transaction.orderId.toString() !== error.orderId
        );
        await wallet.save();
      }
      if (error.couponUpdated && appliedCoupon) {
        appliedCoupon.usedCount = Math.max(0, appliedCoupon.usedCount - 1);
        const userUsageIndex = appliedCoupon.usedBy.findIndex(
          (usage) => usage.userId.toString() === userId.toString()
        );
        if (userUsageIndex >= 0) {
          appliedCoupon.usedBy[userUsageIndex].count = Math.max(0, appliedCoupon.usedBy[userUsageIndex].count - 1);
          if (appliedCoupon.usedBy[userUsageIndex].count === 0) {
            appliedCoupon.usedBy.splice(userUsageIndex, 1);
          }
        }
        await appliedCoupon.save();
      }
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Failed to place order. Please try again.';
    if (error.message.includes('Insufficient stock') ||
        error.message.includes('Stock for') ||
        error.message.includes('not found') ||
        error.message.includes('no longer available')) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorMessage = error.message;
    } else if (error.message.includes('address') ||
               error.message.includes('payment method') ||
               error.message.includes('coupon') ||
               error.message.includes('wallet')) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorMessage = error.message;
    } else if (error.message.includes('unauthorized') ||
               error.message.includes('Unauthorized')) {
      statusCode = HttpStatus.UNAUTHORIZED;
      errorMessage = 'Unauthorized access';
    }
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
};
const adjustCartQuantities = async (req, res) => {
  try {
    console.log('adjustCartQuantities called with body:', req.body); // Debug log

    const userId = req.session.user_id;
    if (!userId) {
      console.log('No user ID in session'); // Debug log
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in' });
    }

    const { adjustments } = req.body; // Array of {productId, newQuantity}
    console.log('Adjustments received:', adjustments); // Debug log

    if (!adjustments || !Array.isArray(adjustments)) {
      console.log('Invalid adjustments data:', adjustments); // Debug log
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid adjustment data'
      });
    }

    if (adjustments.length === 0) {
      console.log('Empty adjustments array'); // Debug log
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No adjustments provided'
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    console.log('Cart found:', cart ? `${cart.items.length} items` : 'null'); // Debug log

    if (!cart || !cart.items.length) {
      console.log('Cart is empty or not found'); // Debug log
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Cart is empty' });
    }

    const MAX_QUANTITY_PER_PRODUCT = 5;
    const adjustmentResults = [];
    let cartModified = false;

    console.log('Processing adjustments...'); // Debug log

    for (const adjustment of adjustments) {
      const { productId, newQuantity } = adjustment;

      if (!productId || typeof newQuantity !== 'number' || newQuantity < 0) {
        adjustmentResults.push({
          productId,
          success: false,
          message: 'Invalid adjustment parameters'
        });
        continue;
      }

      const itemIndex = cart.items.findIndex(item =>
        item.product && item.product._id.toString() === productId.toString()
      );

      if (itemIndex === -1) {
        adjustmentResults.push({
          productId,
          success: false,
          message: 'Item not found in cart'
        });
        continue;
      }

      const item = cart.items[itemIndex];
      const product = item.product;

      // If newQuantity is 0, remove the item
      if (newQuantity === 0) {
        cart.items.splice(itemIndex, 1);
        cartModified = true;
        adjustmentResults.push({
          productId,
          success: true,
          message: 'Item removed from cart',
          action: 'removed'
        });
        continue;
      }

      // Validate against maximum quantity limit
      if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
        adjustmentResults.push({
          productId,
          success: false,
          message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product`
        });
        continue;
      }

      // Validate against available stock
      if (newQuantity > product.stock) {
        adjustmentResults.push({
          productId,
          success: false,
          message: `Only ${product.stock} items in stock`
        });
        continue;
      }

      // Update the quantity
      cart.items[itemIndex].quantity = newQuantity;
      cartModified = true;
      adjustmentResults.push({
        productId,
        success: true,
        message: 'Quantity updated successfully',
        action: 'updated',
        newQuantity
      });
    }

    if (cartModified) {
      // Recalculate cart total
      cart.totalAmount = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.priceAtAddition,
        0
      );
      await cart.save();

      // Clear stock conflicts from session if all conflicts are resolved
      if (req.session.stockConflicts) {
        const remainingConflicts = req.session.stockConflicts.filter(conflict => {
          const adjustment = adjustments.find(adj => adj.productId.toString() === conflict.productId.toString());
          return !adjustment || adjustment.newQuantity > conflict.availableStock;
        });

        if (remainingConflicts.length === 0) {
          delete req.session.stockConflicts;
        } else {
          req.session.stockConflicts = remainingConflicts;
        }
      }
    }

    console.log('Sending response:', {
      success: true,
      message: 'Cart adjustments processed',
      results: adjustmentResults,
      cartCount: cart.items.length,
      totalAmount: cart.totalAmount
    }); // Debug log

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Cart adjustments processed',
      results: adjustmentResults,
      cartCount: cart.items.length,
      totalAmount: cart.totalAmount
    });

  } catch (error) {
    console.error('Error adjusting cart quantities:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getCurrentCartTotal = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Please log in' });
    }
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !cart.items.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Cart is empty' });
    }
    const cartItems = cart.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted);
    if (!cartItems.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'No valid items in cart' });
    }
    let subtotal = 0;
    let offerDiscount = 0;
    for (const item of cartItems) {
      const originalItemTotal = item.priceAtAddition * item.quantity;
      subtotal += originalItemTotal;
      const offer = await getActiveOfferForProduct(item.product._id, item.product.category, item.priceAtAddition);
      if (offer) {
        const { discountAmount, finalPrice } = calculateDiscount(offer, item.priceAtAddition);
        offerDiscount += discountAmount * item.quantity;
        item.discountedPrice = finalPrice;
      } else {
        item.discountedPrice = item.priceAtAddition;
      }
    }
    let couponDiscount = 0;
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findById(req.session.appliedCoupon);
      if (coupon && coupon.isActive && new Date() <= coupon.expiryDate) {
        const amountAfterOffers = subtotal - offerDiscount;
        if (amountAfterOffers >= coupon.minOrderAmount) {
          const couponResult = calculateProportionalCouponDiscount(coupon, cartItems);
          couponDiscount = couponResult.totalDiscount;
        }
      }
    }
    const tax = (subtotal - offerDiscount - couponDiscount) * 0.08;
    const total = subtotal - offerDiscount - couponDiscount + tax;
    const wallet = await Wallet.findOne({ userId });
    const walletBalance = wallet ? wallet.balance : 0;
    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        subtotal,
        offerDiscount,
        couponDiscount,
        tax,
        total,
        walletBalance,
        isWalletEligible: walletBalance >= total
      }
    });
  } catch (error) {
    console.error('Error getting current cart total:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
  }
};
const retryPayment = async (req, res) => {
  try {
    console.log('🔄 RETRY PAYMENT REQUEST:', {
      userId: req.session.user_id,
      orderId: req.params.orderId,
      sessionData: req.session
    });
    const userId = req.session.user_id;
    const { orderId } = req.params;
    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please log in to retry payment'
      });
    }
    console.log('🔍 Searching for order:', { orderId, userId });
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      paymentStatus: 'Pending Payment',
      orderStatus: 'Pending Payment'
    });
    console.log('📦 Order found:', order ? {
      id: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      retryAttempts: order.paymentRetryAttempts
    } : 'No order found');
    if (!order) {
      console.log('❌ Order not found or not in pending payment status');
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Order not found or payment already completed'
      });
    }
    if (order.paymentRetryAttempts >= 5) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Maximum payment retry attempts reached. Please contact support.'
      });
    }
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isListed || product.isDeleted) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Product ${item.model} is no longer available`
        });
      }
      if (product.stock < item.quantity) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Insufficient stock for ${item.model}. Only ${product.stock} items available.`
        });
      }
    }
    const amountInPaise = Math.round(order.total * 100);
    const razorpayOrderData = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `${order.orderNumber}-retry-${order.paymentRetryAttempts + 1}`,
      notes: {
        originalOrderId: order._id.toString(),
        retryAttempt: order.paymentRetryAttempts + 1,
        orderNumber: order.orderNumber
      }
    };
    const razorpayOrder = await razorpay.orders.create(razorpayOrderData);
    order.paymentRetryAttempts += 1;
    order.lastPaymentAttempt = new Date();
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();
    req.session.retryOrder = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id
    };
    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Phoenix',
      description: `Retry Payment - Order #${order.orderNumber}`,
      prefill: {
        name: order.shippingAddress.fullName,
        contact: order.shippingAddress.phone,
      },
      theme: {
        color: '#198754'
      },
      notes: {
        orderNumber: order.orderNumber,
        retryAttempt: order.paymentRetryAttempts
      }
    });
  } catch (error) {
    console.error('❌ Error retrying payment:', error);
    let errorMessage = 'Failed to retry payment';
    let statusCode = 500;
    if (error.message.includes('not found')) {
      errorMessage = 'Order not found';
      statusCode = 404;
    } else if (error.message.includes('stock')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('Razorpay')) {
      errorMessage = 'Payment gateway error. Please try again.';
      statusCode = 502;
    } else if (error.message.includes('unauthorized')) {
      errorMessage = 'Unauthorized access';
      statusCode = 401;
    }
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const verifyRetryPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    const retryOrder = req.session.retryOrder;
    if (!retryOrder) {
      return res.status(400).json({ success: false, message: 'No retry order found' });
    }
    const order = await Order.findById(retryOrder.orderId);
    if (!order) {
      return res.status(400).json({ success: false, message: 'Order not found' });
    }
    order.paymentStatus = 'Paid';
    order.orderStatus = 'Placed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.updatedAt = new Date();
    await order.save();
    delete req.session.retryOrder;
    res.status(200).json({
      success: true,
      message: 'Payment successful',
      orderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    console.error('❌ Error verifying retry payment:', error);
    let errorMessage = 'Payment verification failed';
    let statusCode = 500;
    if (error.message.includes('signature')) {
      errorMessage = 'Invalid payment signature';
      statusCode = 400;
    } else if (error.message.includes('not found')) {
      errorMessage = 'Order not found';
      statusCode = 404;
    }
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const handlePaymentCallback = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.query;

    if (razorpay_payment_id && razorpay_signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const isAuthentic = expectedSignature === razorpay_signature;
      if (isAuthentic) {
        console.log('Payment verified successfully, redirecting to success');
        const order = await Order.findOne({
          razorpayOrderId: razorpay_order_id,
          user: req.session.user_id
        });
        if (order) {
          return res.redirect(`/order-success/${order._id}`);
        } else {
          return res.redirect('/orders');
        }
      } else {
        console.log('Payment signature verification failed');
        return handlePaymentFailureRedirect(req, res, 'Invalid payment signature');
      }
    } else {
      console.log('Payment failed or cancelled, handling failure');
      return handlePaymentFailureRedirect(req, res, 'Payment was cancelled or failed');
    }
  } catch (error) {
    console.error('Error handling payment callback:', error);
    return handlePaymentFailureRedirect(req, res, 'Payment processing error');
  }
};
const handlePaymentFailureRedirect = async (req, res, reason) => {
  try {
    const userId = req.session.user_id;
    const pendingOrder = req.session.pendingOrder;
    if (pendingOrder && userId) {
      const address = await Address.findById(pendingOrder.addressId);
      if (address) {
        const pendingPaymentOrder = new Order({
          user: userId,
          orderNumber: pendingOrder.orderNumber,
          items: pendingOrder.orderItems.map(item => ({
            ...item,
            status: 'Active'
          })),
          shippingAddress: {
            userId: address.userId,
            fullName: address.fullName,
            phone: address.phone,
            pincode: address.pincode,
            district: address.district,
            state: address.state,
            street: address.street,
            landmark: address.landmark,
            isDefault: address.isDefault,
          },
          paymentMethod: 'Razorpay',
          paymentStatus: 'Pending Payment',
          orderStatus: 'Pending Payment',
          subtotal: pendingOrder.subtotal,
          shipping: 0,
          tax: pendingOrder.tax,
          discount: pendingOrder.offerDiscount,
          couponCode: pendingOrder.couponCode,
          couponDiscount: pendingOrder.couponDiscount,
          total: pendingOrder.total,
          createdAt: new Date(),
          updatedAt: new Date(),
          paymentRetryAttempts: 1,
          lastPaymentAttempt: new Date(),
          paymentFailureReason: reason
        });
        await pendingPaymentOrder.save();
        console.log('Pending payment order created:', pendingPaymentOrder.orderNumber);
        req.session.errorMessage = `Payment failed: ${reason}. Your order has been saved and you can retry payment anytime.`;
        return res.redirect(`/orders/${pendingPaymentOrder._id}`);
      }
    }
    req.session.errorMessage = `Payment failed: ${reason}. Please try placing your order again.`;
    return res.redirect('/orders');
  } catch (error) {
    console.error('Error in handlePaymentFailureRedirect:', error);
    req.session.errorMessage = 'Payment failed. Please try again.';
    return res.redirect('/orders');
  }
};
module.exports = {
  getCheckout,
  placeOrder,
  applyCoupon,
  removeCoupon,
  addAddress,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  handlePaymentCallback,
  getCurrentCartTotal,
  adjustCartQuantities,
  retryPayment,
  verifyRetryPayment
};