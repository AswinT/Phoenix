const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

const { HttpStatus } = require("../../helpers/status-code");

/**
 * Get initial payment status based on payment method
 * @param {string} paymentMethod - The payment method used
 * @returns {string} - The appropriate initial payment status
 */
const getInitialPaymentStatus = (paymentMethod) => {
  switch (paymentMethod) {
    case "cod":
      return "Pending"; // COD payment is pending until delivery
    default:
      return "Pending";
  }
};

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `ORD-${timestamp}-${random}`;
};

const getCheckout = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    const userId = req.session.user_id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    // Check if cart exists and has items
    if (!cart || !cart.items || cart.items.length === 0) {
      req.session.errorMessage = "Your cart is empty. Please add items before checkout.";
      return res.redirect("/cart");
    }

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1 });

    // Filter valid items first
    const cartItems = cart.items.filter((item) =>
      item.product &&
      item.product.isListed &&
      !item.product.isDeleted &&
      item.product.stock >= item.quantity
    );

    // If no valid items after filtering, redirect to cart
    if (cartItems.length === 0) {
      req.session.errorMessage = "No valid items in cart. Some items may be unavailable or out of stock.";
      return res.redirect("/cart");
    }

    // Update cart if invalid items were removed
    if (cartItems.length !== cart.items.length) {
      cart.items = cartItems;
      await cart.save();
      req.session.errorMessage = "Some items were removed from your cart as they are no longer available.";
      return res.redirect("/cart");
    }

    let subtotal = 0;
    let tax = 0;
    let totalAmount = 0;
    let cartCount = 0;

    // Calculate subtotal from cart items and add required properties for template
    for (const item of cartItems) {
      const itemTotal = item.priceAtAddition * item.quantity;
      subtotal += itemTotal;

      // Add properties expected by the template
      item.itemTotal = itemTotal;
      item.couponShare = 0; // No coupons implemented yet
      item.offerDiscount = 0; // No offers implemented yet
      item.originalPrice = item.priceAtAddition;
      item.discountedPrice = item.priceAtAddition; // No discounts applied
      item.discountPercentage = 0; // No discounts applied
    }

    tax = subtotal * 0.08;
    totalAmount = subtotal + tax;
    cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Check if user has any addresses
    if (addresses.length === 0) {
      req.session.errorMessage = "Please add a delivery address before proceeding to checkout.";
      return res.redirect("/address");
    }

    res.render("checkout", {
      cartItems,
      subtotal,
      originalSubtotal: subtotal, // Add originalSubtotal for template
      tax,
      totalAmount,
      cartCount,
      addresses,
      user: userId ? { id: userId } : null,
      isAuthenticated: true,
      currentStep: req.query.step ? parseInt(req.query.step) : 1,
      selectedAddressId: req.query.address || "",
      paymentMethod: req.query.paymentMethod || "",
      shippingCost: 0,
      isCodEligible: true, // All orders are eligible for COD
      offerDiscount: 0, // Add offerDiscount for template (no offers implemented yet)
      errorMessage: req.session.errorMessage,
      successMessage: req.session.successMessage
    });

    // Clear messages after rendering
    delete req.session.errorMessage;
    delete req.session.successMessage;

  } catch (error) {
    console.error("Error in rendering checkout page:", error);
    req.session.errorMessage = "Something went wrong. Please try again.";
    return res.redirect("/cart");
  }
};





// Add new address
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Please log in to add an address" });
    }

    const { fullName, phone, pincode, district, state, street, landmark, isDefault } = req.body;

    // Validate inputs
    if (!fullName || !phone || !pincode || !district || !state || !street) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "All required fields must be filled" });
    }

    // Create new address
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

    // If this is set as default, unset any existing default
    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    await newAddress.save();

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};















const placeOrder = async (req, res) => {
  try {

    const userId = req.session.user_id;
    if (!userId) {
      console.error("❌ No user ID in session");
      throw new Error("Please log in to place an order");
    }

    const { addressId, paymentMethod } = req.body;
    console.log("📥 Extracted data:", { addressId, paymentMethod });

    // Validate inputs
    console.log("🔍 Validating inputs...");
    if (!addressId || !paymentMethod) {
      console.error("❌ Missing required fields:", { addressId: !!addressId, paymentMethod: !!paymentMethod });
      throw new Error("Address and payment method are required");
    }
    console.log("✅ Required fields present");

    if (!["cod"].includes(paymentMethod)) {
      console.error("❌ Invalid payment method:", paymentMethod);
      throw new Error("Only COD payments are supported");
    }
    console.log("✅ Payment method valid:", paymentMethod);

    // Fetch and validate address
    const address = await Address.findById(addressId);
    if (!address) {
      throw new Error("Selected address not found");
    }

    if (address.userId.toString() !== userId.toString()) {
      throw new Error("Unauthorized access to address");
    }

    // Comprehensive address validation
    if (!address.fullName || address.fullName.trim().length < 3) {
      throw new Error("Invalid address: Full name is required and must be at least 3 characters");
    }

    if (!address.phone || !/^\d{10}$/.test(address.phone.replace(/\D/g, ""))) {
      throw new Error("Invalid address: Valid 10-digit phone number is required");
    }

    if (!address.pincode || !/^\d{6}$/.test(address.pincode)) {
      throw new Error("Invalid address: Valid 6-digit pincode is required");
    }

    if (!address.district || address.district.trim().length < 3) {
      throw new Error("Invalid address: District is required");
    }

    if (!address.state || address.state.trim().length < 3) {
      throw new Error("Invalid address: State is required");
    }

    if (!address.street || address.street.trim().length < 10) {
      throw new Error("Invalid address: Complete street address is required (minimum 10 characters)");
    }

    // Fetch cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) {
      throw new Error("Cart is empty");
    }

    // Filter valid cart items
    const cartItems = cart.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted);

    if (!cartItems.length) {
      throw new Error("No valid items in cart");
    }

    // Process each item (no offers)
    let subtotal = 0;

    // Prepare order items
    const orderItems = [];
    const itemDetails = {};

    for (const item of cartItems) {
      const itemPrice = item.priceAtAddition;

      const orderItem = {
        product: item.product._id,
        title: item.product.title,
        image: item.product.mainImage,
        price: item.priceAtAddition,
        discountedPrice: itemPrice,
        quantity: item.quantity,
        priceBreakdown: {
          originalPrice: item.priceAtAddition,
          subtotal: item.priceAtAddition * item.quantity,
          finalPrice: itemPrice * item.quantity
        }
      };

      orderItems.push(orderItem);
      subtotal += itemPrice * item.quantity;
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    // Step 1: Stock validation and update (standalone MongoDB compatible)
    const stockUpdates = [];

    try {
      // First pass: Validate stock availability for all products
      for (const item of orderItems) {

        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product ${item.title} not found`);
        }

        // Check if product is still available and listed
        if (!product.isListed || product.isDeleted) {
          throw new Error(`Product ${item.title} is no longer available`);
        }



        const newStock = product.stock - item.quantity;
        if (newStock < 0) {
          throw new Error(`Insufficient stock for ${item.title}. Only ${product.stock} items available.`);
        }

        // Store product info for stock updates
        stockUpdates.push({
          productId: item.product,
          originalStock: product.stock,
          newStock: newStock,
          productTitle: item.title,
          quantityOrdered: item.quantity
        });
      }

      // Second pass: Update stock for all products with optimistic locking
      for (const update of stockUpdates) {
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: update.productId,
            stock: update.originalStock // Ensure stock hasn't changed since we read it
          },
          {
            stock: update.newStock,
            updatedAt: new Date()
          },
          {
            new: true
          }
        );

        if (!updateResult) {
          throw new Error(`Stock for ${update.productTitle} was updated by another process. Please try again.`);
        }


      }

    } catch (stockError) {
      throw stockError;
    }

    // Step 3: Create order
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
      orderStatus: "Placed",
      subtotal,
      shipping: 0,
      tax,
      discount: 0,
      total,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await order.save();

    // Step 4: Order processing complete

    // Step 5: Clear cart
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentDetails: {
        paymentMethod: "cod",
        codMessage: "You can pay cash when your order is delivered"
      }
    });
  } catch (error) {
    console.error("Order placement error:", error.message);

    // Comprehensive rollback mechanism
    try {
      // Rollback stock updates if they were made
      if (typeof stockUpdates !== 'undefined' && stockUpdates && stockUpdates.length > 0) {
        for (const update of stockUpdates) {
          await Product.findByIdAndUpdate(
            update.productId,
            { stock: update.originalStock },
            { new: true }
          );
        }
      }





    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
      // Log rollback failure but don't throw - we still need to respond to user
    }

    // Determine appropriate error status and message
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = "Failed to place order. Please try again.";

    if (error.message.includes("Insufficient stock") ||
        error.message.includes("Stock for") ||
        error.message.includes("not found") ||
        error.message.includes("no longer available")) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorMessage = error.message;
    } else if (error.message.includes("address") ||
               error.message.includes("payment method")) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorMessage = error.message;
    } else if (error.message.includes("unauthorized") ||
               error.message.includes("Unauthorized")) {
      statusCode = HttpStatus.UNAUTHORIZED;
      errorMessage = "Unauthorized access";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
};

// Get current cart total
const getCurrentCartTotal = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Please log in" });
    }

    // Get cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Cart is empty" });
    }

    // Filter valid cart items
    const cartItems = cart.items.filter((item) => item.product && item.product.isListed && !item.product.isDeleted);

    if (!cartItems.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "No valid items in cart" });
    }

    // Calculate subtotal (no offers)
    let subtotal = 0;

    for (const item of cartItems) {
      const originalItemTotal = item.priceAtAddition * item.quantity;
      subtotal += originalItemTotal;
      item.discountedPrice = item.priceAtAddition; // No offers, use original price
    }

    // Calculate final total
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        subtotal,
        offerDiscount: 0,
        tax,
        total
      }
    });

  } catch (error) {
    console.error("Error getting current cart total:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getCheckout,
  placeOrder,
  addAddress,
  getCurrentCartTotal
};