const Order = require("../../models/orderSchema")
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const { processReturnRefund } = require("../userController/wallet-controller");
const { calculateExactRefundAmount } = require("../../helpers/money-calculator");
const { HttpStatus } = require("../../helpers/status-code")

const getManageOrders = async (req, res) => {
  try {
    // Pagination parameters
    const page = Number.parseInt(req.query.page) || 1
    const limit = 10 // Orders per page
    const skip = (page - 1) * limit

    // Build query
    const query = { isDeleted: false }

    // Handle Order Status filter - simplified statuses
    const validStatuses = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Pending Payment"]
    let status = req.query.status || ""
    if (status === "Pending") status = "Placed" // Map "Pending" to "Placed" as per schema
    if (status && validStatuses.includes(status)) {
      query.orderStatus = status
    }

    // Handle Payment Method filter
    const validPaymentMethods = ["COD", "UPI", "Card", "Wallet"]
    let payment = req.query.payment || ""
    if (payment === "CARD") payment = "Card"
    if (payment === "UPI") payment = "UPI"
    if (payment && validPaymentMethods.includes(payment)) {
      query.paymentMethod = payment
    }

    // Handle Order Amount filter
    const minAmount = Number.parseFloat(req.query.min_amount) || 0
    const maxAmount = Number.parseFloat(req.query.max_amount) || Number.POSITIVE_INFINITY
    if (minAmount > 0 || maxAmount < Number.POSITIVE_INFINITY) {
      query.total = {}
      if (minAmount > 0) query.total.$gte = minAmount
      if (maxAmount < Number.POSITIVE_INFINITY) query.total.$lte = maxAmount
    }

    // Handle Order Date filter
    const startDate = req.query.start_date ? new Date(req.query.start_date) : null
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null
    if (startDate && !isNaN(startDate)) {
      query.createdAt = query.createdAt || {}
      query.createdAt.$gte = startDate
    }
    if (endDate && !isNaN(endDate)) {
      // Set endDate to the end of the day
      endDate.setHours(23, 59, 59, 999)
      query.createdAt = query.createdAt || {}
      query.createdAt.$lte = endDate
    }

    // Fetch total number of orders based on the query
    const totalOrders = await Order.countDocuments(query)

    // Fetch orders with pagination, populate user details, and apply filters
    const orders = await Order.find(query)
      .populate("user", "fullName") // Populate user to get customer name
      .sort({ createdAt: -1 }) // Sort by date, newest first
      .skip(skip)
      .limit(limit)
      .lean()

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit)

    // Format order data for display
    orders.forEach((order) => {
      order.formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      order.formattedTotal = `₹${order.total.toFixed(2)}`
      order.customerName = order.user ? order.user.fullName : "Unknown"
    })

    // Pagination data
    const pagination = {
      currentPage: page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
    }

    // Prepare filter values to pre-select in the form
    const filters = {
      status: status || "",
      payment: payment || "",
      min_amount: req.query.min_amount || "",
      max_amount: req.query.max_amount || "",
      start_date: req.query.start_date || "",
      end_date: req.query.end_date || "",
    }

    // Render the manage-orders view
    res.render("manage-orders", {
      orders,
      pagination,
      title: "Manage Orders",
      filters, // Pass filter values for the form
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    res.redirect('/admin/dashboard');
  }
}

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate('user', 'fullName email phone address')
      .populate({
        path: 'items.product',
        select: 'model brand image price'
      })
      .lean();

    if (!order) {
      return res.redirect('/admin/getOrders');
    }

    // Format dates
    order.formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Process each item to include price details
    order.items = order.items.map(item => {
      // Basic price formatting
      const originalPrice = Number(item.price);
      const quantity = Number(item.quantity || 1);

      // Handle price breakdown if available
      if (item.priceBreakdown) {
        const breakdown = {
          originalPrice: Number(item.priceBreakdown.originalPrice),
          subtotal: Number(item.priceBreakdown.subtotal),
          offerDiscount: Number(item.priceBreakdown.offerDiscount || 0),
          priceAfterOffer: Number(item.priceBreakdown.priceAfterOffer),
          couponDiscount: Number(item.priceBreakdown.couponDiscount || 0),
          couponProportion: Number(item.priceBreakdown.couponProportion || 0),
          finalPrice: Number(item.priceBreakdown.finalPrice),
          offerTitle: item.priceBreakdown.offerTitle || ''
        };

        // Format all prices
        item.formattedOriginalPrice = `₹${breakdown.originalPrice.toFixed(2)}`;
        item.formattedPriceAfterOffer = `₹${breakdown.priceAfterOffer.toFixed(2)}`;
        item.formattedFinalPrice = `₹${breakdown.finalPrice.toFixed(2)}`;

        // Calculate per unit prices
        const finalPricePerUnit = breakdown.finalPrice;

        // Calculate total amounts
        item.totalOriginalPrice = breakdown.originalPrice * quantity;
        item.totalPriceAfterOffer = breakdown.priceAfterOffer * quantity;
        item.totalFinalPrice = breakdown.finalPrice * quantity;
        item.totalOfferSavings = breakdown.offerDiscount * quantity;
        item.totalCouponSavings = breakdown.couponDiscount * quantity;

        // Format total amounts
        item.formattedTotalOriginalPrice = `₹${item.totalOriginalPrice.toFixed(2)}`;
        item.formattedTotalFinalPrice = `₹${item.totalFinalPrice.toFixed(2)}`;

        // Calculate and format savings percentage
        if (breakdown.offerDiscount > 0) {
          const offerSavingPercent = (breakdown.offerDiscount / breakdown.originalPrice) * 100;
          item.offerSavingText = `Save ${offerSavingPercent.toFixed(0)}% with ${breakdown.offerTitle}`;
        }

        // Handle refund amount for cancelled/returned items
        if (item.status === 'Cancelled' || item.status === 'Returned') {
          // **FIX: Only show refund for items that actually get wallet refunds**
          const shouldShowRefund = (
            // For COD orders: only show refund if order was delivered (return scenario)
            (order.paymentMethod === 'COD' && order.orderStatus === 'Delivered' && item.status === 'Returned') ||
            // For paid orders: always show refund for cancelled/returned items
            (order.paymentMethod !== 'COD' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded'))
          );

          if (shouldShowRefund) {
            // ACCURATE REFUND CALCULATION - Using Money Calculator
            item.refundAmount = calculateExactRefundAmount(item, order);
            item.formattedRefund = `₹${item.refundAmount.toFixed(2)}`;
            item.taxAmount = 0; // Simplified - no separate tax display
            item.formattedTaxAmount = null;
          } else {
            // No refund for COD cancellations or unpaid orders
            item.refundAmount = 0;
            item.formattedRefund = null;
            item.taxAmount = 0;
            item.formattedTaxAmount = null;
          }
        }

      } else {
        // Fallback for orders without price breakdown
        const discountedPrice = Number(item.discountedPrice || item.price);

        item.formattedOriginalPrice = `₹${originalPrice.toFixed(2)}`;
        item.formattedDiscountedPrice = `₹${discountedPrice.toFixed(2)}`;

        item.totalOriginalPrice = originalPrice * quantity;
        item.totalDiscountedPrice = discountedPrice * quantity;

        item.formattedTotalOriginalPrice = `₹${item.totalOriginalPrice.toFixed(2)}`;
        item.formattedTotalDiscountedPrice = `₹${item.totalDiscountedPrice.toFixed(2)}`;

        if (originalPrice > discountedPrice) {
          const savingPercent = ((originalPrice - discountedPrice) / originalPrice) * 100;
          item.savingText = `Save ${savingPercent.toFixed(0)}%`;
        }

        // Handle refund amount for cancelled/returned items
        if (item.status === 'Cancelled' || item.status === 'Returned') {
          // **FIX: Only show refund for items that actually get wallet refunds**
          const shouldShowRefund = (
            // For COD orders: only show refund if order was delivered (return scenario)
            (order.paymentMethod === 'COD' && order.orderStatus === 'Delivered' && item.status === 'Returned') ||
            // For paid orders: always show refund for cancelled/returned items
            (order.paymentMethod !== 'COD' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded'))
          );

          if (shouldShowRefund) {
            // ACCURATE REFUND CALCULATION - Using Money Calculator
            item.refundAmount = calculateExactRefundAmount(item, order);
            item.formattedRefund = `₹${item.refundAmount.toFixed(2)}`;
            item.taxAmount = 0; // Simplified - no separate tax display
            item.formattedTaxAmount = null;
          } else {
            // No refund for COD cancellations or unpaid orders
            item.refundAmount = 0;
            item.formattedRefund = null;
            item.taxAmount = 0;
            item.formattedTaxAmount = null;
          }
        }
      }

      return item;
    });

    // Calculate order totals
    const totals = {
      subtotal: 0,
      offerDiscount: 0,
      couponDiscount: 0,
      tax: Number(order.tax || 0),
      shipping: Number(order.shipping || 0),
      totalRefunded: 0
    };

    // Calculate totals from items
    order.items.forEach(item => {
      if (item.priceBreakdown) {
        totals.subtotal += item.totalOriginalPrice;
        totals.offerDiscount += item.totalOfferSavings;
        totals.couponDiscount += item.totalCouponSavings;

        if (item.status === 'Cancelled' || item.status === 'Returned') {
          // Only add to total refunded if there's actually a refund amount
          if (item.refundAmount && item.refundAmount > 0) {
            totals.totalRefunded += item.refundAmount;
          }
        }
      } else {
        totals.subtotal += item.totalOriginalPrice;
        totals.offerDiscount += (item.totalOriginalPrice - item.totalDiscountedPrice);

        if (item.status === 'Cancelled' || item.status === 'Returned') {
          // Only add to total refunded if there's actually a refund amount
          if (item.refundAmount && item.refundAmount > 0) {
            totals.totalRefunded += item.refundAmount;
          }
        }
      }
    });

    // **CRITICAL FIX: Apply same total correction as other controllers**
    // Recalculate correct total to ensure consistency across all admin pages
    let recalculatedSubtotal = 0;
    order.items.forEach(item => {
      if (item.priceBreakdown) {
        recalculatedSubtotal += item.priceBreakdown.subtotal || (item.price * item.quantity);
      } else {
        recalculatedSubtotal += item.price * item.quantity;
      }
    });

    const useStoredSubtotal = order.subtotal && Math.abs(order.subtotal - recalculatedSubtotal) < 0.01;
    const displaySubtotal = useStoredSubtotal ? order.subtotal : recalculatedSubtotal;

    // Recalculate correct total
    const correctTotal = displaySubtotal - (order.discount || 0) - (order.couponDiscount || 0) + (order.tax || 0);
    const useStoredTotal = order.total && Math.abs(order.total - correctTotal) < 0.01;
    const displayTotal = useStoredTotal ? order.total : correctTotal;

    // Update order.total for accurate display and calculations
    order.total = displayTotal;

    // Format order totals with corrected values
    order.formattedSubtotal = `₹${displaySubtotal.toFixed(2)}`;
    order.formattedOfferDiscount = totals.offerDiscount > 0 ? `₹${totals.offerDiscount.toFixed(2)}` : null;
    order.formattedCouponDiscount = totals.couponDiscount > 0 ? `₹${totals.couponDiscount.toFixed(2)}` : null;
    order.formattedTax = `₹${totals.tax.toFixed(2)}`;
    order.formattedShipping = totals.shipping > 0 ? `₹${totals.shipping.toFixed(2)}` : 'Free';
    order.formattedTotal = `₹${displayTotal.toFixed(2)}`; // Use corrected total
    order.formattedTotalRefunded = totals.totalRefunded > 0 ? `₹${totals.totalRefunded.toFixed(2)}` : null;

    // Check item statuses
    const hasActiveItems = order.items.some(item =>
      item.status !== 'Cancelled' && item.status !== 'Returned'
    );

    const hasReturnRequestedItems = order.items.some(item =>
      item.status === 'Return Requested'
    );

    // Generate timeline data
    const timeline = [];

    timeline.push({
      status: 'Order Placed',
      timestamp: new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      message: 'Order has been placed successfully',
      completed: true
    });

    if (order.processedAt || order.orderStatus === 'Processing') {
      timeline.push({
        status: 'Processing',
        timestamp: order.processedAt ? new Date(order.processedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Pending',
        message: 'Order is being processed',
        completed: !!order.processedAt
      });
    }

    if (order.shippedAt || order.orderStatus === 'Shipped') {
      timeline.push({
        status: 'Shipped',
        timestamp: order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Pending',
        message: order.trackingId ? `Order shipped with tracking ID: ${order.trackingId}` : 'Order has been shipped',
        completed: !!order.shippedAt
      });
    }

    if (order.deliveredAt || order.orderStatus === 'Delivered') {
      timeline.push({
        status: 'Delivered',
        timestamp: order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Pending',
        message: 'Order has been delivered',
        completed: !!order.deliveredAt
      });
    }

    if (order.orderStatus.includes('Cancelled') || order.orderStatus.includes('Returned')) {
      timeline.push({
        status: order.orderStatus,
        timestamp: (order.cancelledAt || order.returnedAt) ?
          new Date(order.cancelledAt || order.returnedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'N/A',
        message: `Order has been ${order.orderStatus.toLowerCase()}`,
        completed: true,
        // Only show refund amount if there's actually a refund (not for COD cancellations)
        refundAmount: order.formattedTotalRefunded
      });
    }

    res.render('manage-order-details', {
      title: `Order #${order.orderNumber}`,
      order,
      hasActiveItems,
      hasReturnRequestedItems,
      timeline,
      customer: order.user || {}
    });

  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    res.redirect('/admin/getOrders');
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id
    const { status, itemId } = req.body

    // Validate the new status
    const validStatuses = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"]
    if (!validStatuses.includes(status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Invalid status value" })
    }

    // Fetch the order
    const order = await Order.findById(orderId)
    if (!order || order.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Order not found" })
    }

    // If itemId is provided, update just that item
    if (itemId) {
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Item not found in order" });
      }

      // Define allowed item status transitions
      const itemStatusTransitions = {
        'Active': ['Cancelled', 'Returned'],
        'Cancelled': [],
        'Returned': []
      };

      // Check if the transition is allowed for this item
      const allowedItemStatuses = itemStatusTransitions[item.status] || [];
      if (!allowedItemStatuses.includes(status)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Cannot update item status from ${item.status} to ${status}`
        });
      }

      // Update the item status
      const now = new Date();
      item.status = status;

      if (status === 'Cancelled') {
        item.cancelledAt = now;
        item.cancellationReason = 'Cancelled by admin';

        // Restore product stock
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      } else if (status === 'Returned') {
        item.returnedAt = now;
        item.returnReason = 'Returned by admin';

        // Restore product stock
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }

      // Update overall order status based on item statuses
      const hasActiveItems = order.items.some(i => i.status === 'Active');
      const hasCancelledItems = order.items.some(i => i.status === 'Cancelled');
      const hasReturnedItems = order.items.some(i => i.status === 'Returned');

      if (!hasActiveItems) {
        // If no active items remain
        if (hasReturnedItems && !hasCancelledItems) {
          order.orderStatus = 'Returned';
        } else if (hasCancelledItems && !hasReturnedItems) {
          order.orderStatus = 'Cancelled';
        } else if (hasReturnedItems && hasCancelledItems) {
          // Both returned and cancelled items exist
          order.orderStatus = 'Partially Returned';
        }
      } else {
        // Some active items remain
        if (hasReturnedItems && hasCancelledItems) {
          // Both returned and cancelled items exist
          order.orderStatus = 'Partially Returned';
        } else if (hasReturnedItems) {
          order.orderStatus = 'Partially Returned';
        } else if (hasCancelledItems) {
          order.orderStatus = 'Partially Cancelled';
        }
      }

      await order.save();
      return res.status(HttpStatus.OK).json({ success: true, message: "Item status updated successfully" });
    }

    // **FIXED: PARTIALLY CANCELLED ORDERS CAN STILL BE UPDATED**
    // Note: Returns are handled separately through the Return Management system
    const statusTransitions = {
      Placed: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Delivered"],
      // **CRITICAL FIX: Partially Cancelled orders can still progress**
      "Partially Cancelled": ["Processing", "Shipped", "Delivered", "Cancelled"],
      // **NEW: Allow Pending Payment to be cancelled**
      "Pending Payment": ["Cancelled"],
      // **ONLY THESE ARE TRULY TERMINAL**
      Delivered: [], // Terminal - returns handled through Return Management
      Cancelled: [], // Terminal
      Returned: [], // Terminal
      "Partially Returned": [], // Terminal
      "Return Requested": [], // Terminal - handled through Return Management
      "Partially Return Requested": [], // Terminal - handled through Return Management
    }

    // **PRODUCTION-READY TRANSITION VALIDATION**
    const allowedStatuses = statusTransitions[order.orderStatus] || []
    if (!allowedStatuses.includes(status)) {
      let errorMessage = '';

      if (order.orderStatus.includes('Return')) {
        errorMessage = `This order has return requests. Please use the Return Management page to handle returns.`;
      } else if (order.orderStatus === 'Delivered') {
        errorMessage = `This order has been delivered successfully. No further status updates are needed.`;
      } else if (['Cancelled', 'Returned', 'Partially Cancelled', 'Partially Returned'].includes(order.orderStatus)) {
        errorMessage = `Cannot update status from ${order.orderStatus} - this is a terminal state.`;
      } else {
        errorMessage = `Cannot transition from ${order.orderStatus} to ${status}. Allowed transitions: ${allowedStatuses.join(', ') || 'None'}`;
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      })
    }

    // Update the order status and set timestamps
    const now = new Date()
    order.orderStatus = status

    // For partial statuses, we need special handling
    if (order.orderStatus === "Partially Cancelled" || order.orderStatus === "Partially Returned") {
      if (status === "Cancelled") {
        // Cancel all remaining active items
        order.items.forEach((item) => {
          if (item.status === "Active") {
            item.status = "Cancelled"
            item.cancelledAt = now
            item.cancellationReason = "Cancelled by admin"

            // Restore product stock
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: item.quantity } }
            ).catch(err => console.error("Error updating product stock:", err));
          }
        })
      }
      // Note: Return handling removed - returns are handled through Return Management system
    } else if (status === "Cancelled") {
      // Cancel all items
      order.items.forEach((item) => {
        if (item.status === "Active") {
          item.status = "Cancelled"
          item.cancelledAt = now
          item.cancellationReason = "Cancelled by admin"

          // Restore product stock
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
          ).catch(err => console.error("Error updating product stock:", err));
        }
      })
    }
    // Note: Return handling removed - returns are handled through Return Management system

    // Set the appropriate timestamp based on the new status
    if (status === "Processing") {
      order.processedAt = now
    } else if (status === "Shipped") {
      order.shippedAt = now
      // Ensure processedAt is set if not already (for consistency)
      if (!order.processedAt) {
        order.processedAt = order.createdAt
      }
    } else if (status === "Delivered") {
      order.deliveredAt = now
      // Ensure processedAt and shippedAt are set if not already
      if (!order.processedAt) {
        order.processedAt = order.createdAt
      }
      if (!order.shippedAt) {
        order.shippedAt = new Date(order.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)
      }
      // For COD orders, update payment status to "Paid" upon delivery
      if (order.paymentMethod === "COD") {
        order.paymentStatus = "Paid"
      }
    } else if (status === "Cancelled") {
      order.cancelledAt = now
      // Handle payment status based on payment method and current status
      if (order.paymentMethod === "COD") {
        order.paymentStatus = "Failed" // COD cancelled = no payment needed
      } else if (order.paymentStatus === "Paid") {
        order.paymentStatus = "Refund Initiated" // Paid orders get refund initiated
      } else if (order.paymentStatus === "Pending") {
        order.paymentStatus = "Failed" // Pending online payments become failed
      }
    }
    // Note: Return status handling removed - returns are handled through Return Management system

    await order.save()

    res.status(HttpStatus.OK).json({ success: true, message: "Order status updated successfully" })
  } catch (error) {
    console.error("Error updating order status:", error)
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to update order status" })
  }
}

const updateItemStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const itemId = req.params.itemId;
    const { status, reason } = req.body;

    // Validate the new status
    const validStatuses = ["Cancelled", "Returned"];
    if (!validStatuses.includes(status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid status value" });
    }

    // Fetch the order
    const order = await Order.findById(orderId);
    if (!order || order.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "Order not found" });
    }

    // Find the item
    const item = order.items.id(itemId);
    if (!item) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "Item not found in order" });
    }

    // Check if item can be updated
    if (item.status !== "Active") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Item cannot be ${status.toLowerCase()} in its current state (${item.status})`
      });
    }

    // Update the item status
    const now = new Date();
    item.status = status;

    if (status === "Cancelled") {
      item.cancelledAt = now;
      item.cancellationReason = reason || "Cancelled by admin";

      // Restore product stock
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    } else if (status === "Returned") {
      item.returnedAt = now;
      item.returnReason = reason || "Returned by admin";

      // Restore product stock
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    // **FIX: Enhanced order status calculation for admin item updates**
    const hasActiveItems = order.items.some(i => i.status === "Active");
    const hasCancelledItems = order.items.some(i => i.status === "Cancelled");
    const hasReturnedItems = order.items.some(i => i.status === "Returned");
    const hasReturnRequestedItems = order.items.some(i => i.status === "Return Requested");

    if (!hasActiveItems && !hasReturnRequestedItems) {
      // No active or return requested items remain
      if (hasReturnedItems && hasCancelledItems) {
        order.orderStatus = "Partially Returned"; // Mixed returned and cancelled
      } else if (hasReturnedItems) {
        order.orderStatus = "Returned"; // All returned
      } else if (hasCancelledItems) {
        order.orderStatus = "Cancelled"; // All cancelled
      }
    } else if (hasCancelledItems || hasReturnedItems) {
      // Some items cancelled/returned, some still active or return requested
      if (hasCancelledItems && hasReturnedItems) {
        order.orderStatus = "Partially Returned"; // Mixed scenario
      } else if (hasCancelledItems) {
        order.orderStatus = "Partially Cancelled";
      } else if (hasReturnedItems) {
        order.orderStatus = "Partially Returned";
      }
    } else if (hasReturnRequestedItems && hasActiveItems) {
      // Some items have return requests, some are still active
      order.orderStatus = "Partially Return Requested";
    } else if (hasReturnRequestedItems && !hasActiveItems) {
      // All remaining items have return requests
      order.orderStatus = "Return Requested";
    }
    // If only active items remain, keep the current order status

    // **FIX: Enhanced payment status handling for all edge cases**
    if (status === "Cancelled" || status === "Returned") {
      if (order.paymentMethod === "COD") {
        // COD payment status logic based on delivery status
        const wasDeliveredAndPaid = order.paymentStatus === "Paid" ||
                                    order.orderStatus === "Delivered" ||
                                    order.deliveredAt ||
                                    order.items.some(item =>
                                      item.status === "Delivered" ||
                                      item.status === "Returned" ||
                                      (item.status === "Active" && order.orderStatus === "Delivered")
                                    );

        if (wasDeliveredAndPaid) {
          // COD was delivered, customer paid cash
          if (!hasActiveItems && !hasReturnRequestedItems) {
            // All items processed
            order.paymentStatus = status === "Cancelled" ? "Refunded" : "Refunded";
          } else {
            // Partial processing
            order.paymentStatus = "Partially Refunded";
          }
        } else {
          // COD not delivered yet
          if (!hasActiveItems && !hasReturnRequestedItems) {
            order.paymentStatus = "Failed"; // No payment was made
          }
          // For partial operations before delivery, keep existing status
        }
      } else {
        // Online payment methods (Wallet, Razorpay, etc.)
        if (order.paymentStatus === "Paid" || order.paymentStatus === "Partially Refunded") {
          if (!hasActiveItems && !hasReturnRequestedItems) {
            // All items processed
            order.paymentStatus = "Refunded";
          } else {
            // Partial processing
            order.paymentStatus = "Partially Refunded";
          }
        } else if (order.paymentStatus === "Pending" && !hasActiveItems && !hasReturnRequestedItems) {
          order.paymentStatus = "Failed";
        }
      }
    }

    await order.save();

    res.status(HttpStatus.OK).json({
      message: `Item ${status.toLowerCase()} successfully`,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error(`Error updating item status:`, error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id

    // Fetch the order with populated product details
    const order = await Order.findOne({
      _id: orderId,
      isDeleted: false,
    }).populate('items.product')

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).send("Order not found")
    }

    // Fetch user data
    const user = await User.findById(order.user, "fullName email").lean()
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).send("User not found")
    }

    // Format order data
    order.formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // **CRITICAL FIX: Use consistent subtotal and total calculation**
    let recalculatedSubtotal = 0;
    order.items.forEach(item => {
      if (item.priceBreakdown) {
        recalculatedSubtotal += item.priceBreakdown.subtotal || (item.price * item.quantity);
      } else {
        recalculatedSubtotal += item.price * item.quantity;
      }
    });

    const useStoredSubtotal = order.subtotal && Math.abs(order.subtotal - recalculatedSubtotal) < 0.01;
    const displaySubtotal = useStoredSubtotal ? order.subtotal : recalculatedSubtotal;

    // **CRITICAL FIX: Recalculate correct total (same as other functions)**
    const correctTotal = displaySubtotal - (order.discount || 0) - (order.couponDiscount || 0) + (order.tax || 0);
    const useStoredTotal = order.total && Math.abs(order.total - correctTotal) < 0.01;
    const displayTotal = useStoredTotal ? order.total : correctTotal;

    order.formattedTotal = `₹${displayTotal.toFixed(2)}`
    order.formattedSubtotal = `₹${displaySubtotal.toFixed(2)}`
    order.formattedTax = `₹${(order.tax || 0).toFixed(2)}`
    order.formattedDiscount = order.discount ? `₹${order.discount.toFixed(2)}` : "₹0.00"
    order.formattedCouponDiscount = order.couponDiscount ? `₹${order.couponDiscount.toFixed(2)}` : "₹0.00"

    // **IMPORTANT: Update the order.total for PDF generation**
    order.total = displayTotal;

    order.items.forEach((item) => {
      item.formattedPrice = `₹${item.price.toFixed(2)}`
      item.formattedDiscountedPrice = item.discountedPrice ? `₹${item.discountedPrice.toFixed(2)}` : item.formattedPrice
      item.formattedOfferDiscount = item.offerDiscount ? `₹${item.offerDiscount.toFixed(2)}` : "₹0.00"
    })

    // Create PDF with proper margins
    const PDFDocument = require("pdfkit")
    const path = require("path")
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    })

    const filename = `invoice-${order.orderNumber}.pdf`

    // Set response headers
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)

    // Pipe PDF to response
    doc.pipe(res)

    // Define colors and styles for modern design
    const colors = {
      primary: '#2563EB',      // Professional Blue
      secondary: '#6B7280',    // Gray
      dark: '#111827',         // Dark gray
      light: '#F8FAFC',        // Light gray
      success: '#059669',      // Green
      danger: '#DC2626',       // Red
      border: '#E5E7EB',       // Border gray
      accent: '#7C3AED'        // Purple accent
    };

    // Document dimensions
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;

    // Add professional header with logo and company info
    try {
      doc.image(path.join(__dirname, "../../public/assets/phoenix-logo.png"), leftMargin, 50, { width: 50 });
    } catch (error) {
      console.log('Logo image not found, continuing without logo');
    }

    // Company name with professional styling
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor(colors.primary)
       .text('PHOENIX', leftMargin + 70, 50);

    // Tagline with elegant typography
    doc.font('Helvetica-Oblique')
       .fontSize(11)
       .fillColor(colors.secondary)
       .text('Premium Headphone Experience', leftMargin + 70, 82);

    // Add company contact information
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(colors.secondary)
       .text('Email: support@phoenix.com | Phone: +91 1234567890', leftMargin + 70, 98)
       .text('Website: www.phoenix.com', leftMargin + 70, 110);

    // Add professional accent line
    doc.strokeColor(colors.primary)
       .lineWidth(2)
       .moveTo(leftMargin + 70, 125)
       .lineTo(leftMargin + 250, 125)
       .stroke();

    // Add professional invoice title and details in a box
    const invoiceBoxX = rightMargin - 180;
    const invoiceBoxY = 50;
    const invoiceBoxWidth = 170;
    const invoiceBoxHeight = 100;

    // Invoice box background
    doc.fillColor(colors.light)
       .rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight)
       .fill();

    // Invoice box border
    doc.strokeColor(colors.primary)
       .lineWidth(2)
       .rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight)
       .stroke();

    // Invoice title
    doc.font('Helvetica-Bold')
       .fontSize(26)
       .fillColor(colors.primary)
       .text('INVOICE', invoiceBoxX + 10, invoiceBoxY + 15, { align: 'center', width: invoiceBoxWidth - 20 });

    // Invoice details - vertical layout (line by line)
    const detailsStartY = invoiceBoxY + 40;
    const lineHeight = 18;

    // Invoice Number
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.secondary)
       .text('Invoice Number: ', invoiceBoxX + 10, detailsStartY, { continued: true })
       .font('Helvetica-Bold')
       .fillColor(colors.dark)
       .text(`#${order.orderNumber}`);

    // Date
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(colors.secondary)
       .text('Date: ', invoiceBoxX + 10, detailsStartY + lineHeight, { continued: true })
       .font('Helvetica-Bold')
       .fillColor(colors.dark)
       .text(`${order.formattedDate}`);

    // Status
    const orderStatusColor = order.orderStatus === 'Delivered' ? colors.success :
                            order.orderStatus === 'Returned' ? colors.danger :
                            order.orderStatus === 'Cancelled' ? colors.danger : colors.primary;

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(colors.secondary)
       .text('Status: ', invoiceBoxX + 10, detailsStartY + (lineHeight * 2), { continued: true })
       .font('Helvetica-Bold')
       .fillColor(orderStatusColor)
       .text(`${order.orderStatus}`);

    // Add separator line
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(leftMargin, 160)
       .lineTo(rightMargin, 160)
       .stroke();

    // Add billing and shipping info
    const billingStartY = 180;

    // Billing info with professional styling
    const billingBoxWidth = 250;
    const billingBoxHeight = 120;

    // Billing box background
    doc.fillColor('#FAFBFC')
       .rect(leftMargin, billingStartY, billingBoxWidth, billingBoxHeight)
       .fill();

    // Billing box border
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .rect(leftMargin, billingStartY, billingBoxWidth, billingBoxHeight)
       .stroke();

    // Billing header
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(colors.primary)
       .text('BILL TO', leftMargin + 10, billingStartY + 10);

    // Billing details
    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor(colors.dark)
       .text(order.shippingAddress.fullName || user.fullName || 'N/A', leftMargin + 10, billingStartY + 30);

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.dark)
       .text(order.shippingAddress.street || '', leftMargin + 10, billingStartY + 45)
       .text(`${order.shippingAddress.district || ''}, ${order.shippingAddress.state || ''} - ${order.shippingAddress.pincode || ''}`, leftMargin + 10, billingStartY + 60)
       .text(`Phone: ${order.shippingAddress.phone || 'N/A'}`, leftMargin + 10, billingStartY + 75)
       .text(`Email: ${user.email || 'N/A'}`, leftMargin + 10, billingStartY + 90);

    // Payment info with professional styling
    const paymentBoxX = rightMargin - 200;
    const paymentBoxWidth = 190;
    const paymentBoxHeight = 80;

    // Payment box background
    doc.fillColor('#F0F9FF')
       .rect(paymentBoxX, billingStartY, paymentBoxWidth, paymentBoxHeight)
       .fill();

    // Payment box border
    doc.strokeColor(colors.primary)
       .lineWidth(1)
       .rect(paymentBoxX, billingStartY, paymentBoxWidth, paymentBoxHeight)
       .stroke();

    // Payment header
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(colors.primary)
       .text('PAYMENT DETAILS', paymentBoxX + 10, billingStartY + 10);

    // Payment method
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.secondary)
       .text('Method:', paymentBoxX + 10, billingStartY + 35)
       .font('Helvetica-Bold')
       .fillColor(colors.dark)
       .text(`${order.paymentMethod || 'Cash on Delivery'}`, paymentBoxX + 10, billingStartY + 50);

    // Payment status
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.secondary)
       .text('Status:', paymentBoxX + 100, billingStartY + 35);

    const paymentStatusColor = order.paymentStatus === 'Paid' ? colors.success :
                              order.paymentStatus === 'Pending' ? '#F59E0B' : colors.danger;

    doc.font('Helvetica-Bold')
       .fillColor(paymentStatusColor)
       .text(`${order.paymentStatus || 'Pending'}`, paymentBoxX + 100, billingStartY + 50);

    // Add separator line
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(leftMargin, billingStartY + 140)
       .lineTo(rightMargin, billingStartY + 140)
       .stroke();

    // Order items table
    const tableTop = billingStartY + 160;
    const tableHeaders = ['Headphone', 'Price', 'Quantity', 'Discount', 'Total'];
    const colWidths = [0.40, 0.15, 0.15, 0.15, 0.15]; // Proportions of contentWidth

    // Calculate column positions
    const colPositions = [];
    let currentPosition = leftMargin;

    colWidths.forEach(width => {
      colPositions.push(currentPosition);
      currentPosition += width * contentWidth;
    });

    // Add table header
    doc.fillColor(colors.light)
       .rect(leftMargin, tableTop, contentWidth, 25)
       .fill();

    doc.font('Helvetica-Bold')
       .fontSize(10)
       .fillColor(colors.dark);

    tableHeaders.forEach((header, i) => {
      const align = i === 0 ? 'left' : 'right';
      const x = colPositions[i];
      const width = colWidths[i] * contentWidth;

      doc.text(header, x + 5, tableTop + 8, { width: width - 10, align });
    });

    // Add table rows
    let y = tableTop + 25;

    order.items.forEach((item, index) => {
      // Alternate row background for better readability
      if (index % 2 === 1) {
        doc.fillColor('#F9FAFB')
           .rect(leftMargin, y, contentWidth, 35)
           .fill();
      }

      doc.fillColor(colors.dark)
         .font('Helvetica')
         .fontSize(10);

      // Item name with status (prefer model over title for headphones)
      let itemTitle = item.model || item.title || 'Unknown Product';
      if (item.status !== 'Active') {
        itemTitle += ` (${item.status})`;
      }

      doc.text(itemTitle, colPositions[0] + 5, y + 5, {
        width: colWidths[0] * contentWidth - 10,
        align: 'left'
      });

      // Add offer title if exists
      if (item.offerTitle) {
        doc.fillColor(colors.success)
           .fontSize(8)
           .text(item.offerTitle, colPositions[0] + 5, y + 20, {
             width: colWidths[0] * contentWidth - 10,
             align: 'left'
           });
      }

      // Price
      doc.fillColor(colors.dark)
         .fontSize(10)
         .text(`₹${item.price.toFixed(2)}`, colPositions[1] + 5, y + 12, {
           width: colWidths[1] * contentWidth - 10,
           align: 'right'
         });

      // Quantity
      doc.text(item.quantity.toString(), colPositions[2] + 5, y + 12, {
        width: colWidths[2] * contentWidth - 10,
        align: 'right'
      });

      // Discount
      const itemDiscount = (item.offerDiscount || 0) * item.quantity;
      doc.fillColor(colors.success)
         .text(`₹${itemDiscount.toFixed(2)}`, colPositions[3] + 5, y + 12, {
           width: colWidths[3] * contentWidth - 10,
           align: 'right'
         });

      // Total
      const itemTotal = (item.discountedPrice || item.price) * item.quantity;
      doc.fillColor(colors.dark)
         .text(`₹${itemTotal.toFixed(2)}`, colPositions[4] + 5, y + 12, {
           width: colWidths[4] * contentWidth - 10,
           align: 'right'
         });

      y += 35;
    });

    // Add table border
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .rect(leftMargin, tableTop, contentWidth, y - tableTop)
       .stroke();

    // Add horizontal lines for each row
    let lineY = tableTop + 25;
    for (let i = 0; i < order.items.length; i++) {
      doc.moveTo(leftMargin, lineY)
         .lineTo(rightMargin, lineY)
         .stroke();
      lineY += 35;
    }

    // Add vertical lines for columns
    colPositions.forEach((x, i) => {
      if (i === 0) return; // Skip first column
      doc.moveTo(x, tableTop)
         .lineTo(x, y)
         .stroke();
    });

    // Add order summary
    const summaryStartY = y + 20;
    const summaryWidth = 200;
    const summaryX = rightMargin - summaryWidth;

    // Subtotal - use consistent calculation
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.secondary)
       .text('Subtotal:', summaryX, summaryStartY, { width: 100, align: 'left' })
       .fillColor(colors.dark)
       .text(`₹${displaySubtotal.toFixed(2)}`, summaryX + 100, summaryStartY, { width: 100, align: 'right' });

    // Tax
    doc.fillColor(colors.secondary)
       .text('Tax (8%):', summaryX, summaryStartY + 20, { width: 100, align: 'left' })
       .fillColor(colors.dark)
       .text(`₹${(order.tax || 0).toFixed(2)}`, summaryX + 100, summaryStartY + 20, { width: 100, align: 'right' });

    // Offer discount
    if (order.discount > 0) {
      doc.fillColor(colors.secondary)
         .text('Offer Discount:', summaryX, summaryStartY + 40, { width: 100, align: 'left' })
         .fillColor(colors.success)
         .text(`- ₹${order.discount.toFixed(2)}`, summaryX + 100, summaryStartY + 40, { width: 100, align: 'right' });
    }

    // Coupon discount
    if (order.couponDiscount && order.couponDiscount > 0) {
      const yPos = order.discount > 0 ? summaryStartY + 60 : summaryStartY + 40;
      doc.fillColor(colors.secondary)
         .text(`Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}:`, summaryX, yPos, { width: 100, align: 'left' })
         .fillColor(colors.success)
         .text(`- ₹${order.couponDiscount.toFixed(2)}`, summaryX + 100, yPos, { width: 100, align: 'right' });
    }

    // Total
    const totalY = summaryStartY + (order.discount > 0 ? 80 : 60);

    // Add separator line before total
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(summaryX, totalY - 10)
       .lineTo(rightMargin, totalY - 10)
       .stroke();

    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.primary)
       .text('Total:', summaryX, totalY, { width: 100, align: 'left' })
       .text(`₹${order.total.toFixed(2)}`, summaryX + 100, totalY, { width: 100, align: 'right' });

    // Add footer
    const footerY = Math.max(y + 200, totalY + 100);

    // Add separator line
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(leftMargin, footerY - 30)
       .lineTo(rightMargin, footerY - 30)
       .stroke();

    // Professional footer with enhanced styling
    const footerBoxHeight = 60;

    // Footer background
    doc.fillColor(colors.light)
       .rect(leftMargin, footerY - 10, contentWidth, footerBoxHeight)
       .fill();

    // Footer border
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .rect(leftMargin, footerY - 10, contentWidth, footerBoxHeight)
       .stroke();

    // Thank you message
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(colors.primary)
       .text('Thank you for choosing Phoenix!', leftMargin, footerY + 5, { align: 'center', width: contentWidth });

    // Footer details
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(colors.secondary)
       .text('This is a computer-generated invoice and does not require a signature.', leftMargin, footerY + 25, { align: 'center', width: contentWidth })
       .text('For any queries, contact us at support@phoenix.com or +91 9876543210', leftMargin, footerY + 38, { align: 'center', width: contentWidth });

    // Add page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor(colors.secondary)
         .text(`Page ${i + 1} of ${pageCount}`, leftMargin, doc.page.height - 50, { align: 'center', width: contentWidth });
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Error generating invoice:", error)
    res.status(500).send("Internal server error")
  }
}

const approveReturnRequest = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemId, approved } = req.body;

    // Fetch the order
    const order = await Order.findById(orderId);
    if (!order || order.isDeleted) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If itemId is provided, update just that item
    if (itemId) {
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found in order" });
      }

      if (item.status !== 'Return Requested') {
        return res.status(400).json({
          message: `Cannot process return for item with status ${item.status}`
        });
      }

      const now = new Date();

      if (approved) {
        // Approve the return
        item.status = 'Returned';
        item.returnedAt = now;

        // Restore product stock
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );

        // Process refund to wallet if payment was made
        if (order.paymentStatus === 'Paid') {
          console.log('Processing refund for approved return item:', itemId);
          const refundSuccess = await processReturnRefund(order.user, order, itemId);
          if (refundSuccess) {
            const allItemsRefunded = order.items.every(i =>
              i.status === 'Returned' || i.status === 'Cancelled'
            );
            order.paymentStatus = allItemsRefunded ? 'Refunded' : 'Partially Refunded';
            console.log('Refund processed successfully, payment status updated to:', order.paymentStatus);
          } else {
            order.paymentStatus = 'Refund Processing';
            console.log('Refund processing failed, status set to Refund Processing');
          }
        } else {
          console.log('Order payment status is not Paid, skipping refund:', order.paymentStatus);
        }
      } else {
        // Reject the return request
        item.status = 'Active';
        item.returnRequestedAt = null;
        item.returnReason = null;
      }

      // Update overall order status - simplified logic
      const hasActiveItems = order.items.some(i => i.status === 'Active');
      const hasReturnRequestedItems = order.items.some(i => i.status === 'Return Requested');
      const hasCancelledItems = order.items.some(i => i.status === 'Cancelled');
      const hasReturnedItems = order.items.some(i => i.status === 'Returned');

      // Determine order status based on item statuses
      if (!hasActiveItems && !hasReturnRequestedItems) {
        // All items are either cancelled or returned
        if (hasReturnedItems && !hasCancelledItems) {
          order.orderStatus = 'Returned';
        } else if (hasCancelledItems && !hasReturnedItems) {
          order.orderStatus = 'Cancelled';
        } else {
          // Mixed cancelled and returned items - keep as delivered with mixed items
          order.orderStatus = 'Delivered';
        }
      } else if (hasReturnRequestedItems) {
        // Keep current status if there are pending return requests
        // Don't change to partial status
      } else {
        // Some items are still active
        order.orderStatus = 'Delivered';
      }

      await order.save();
      return res.status(200).json({
        message: approved ? "Return request approved" : "Return request rejected",
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      });
    }

    // Handle entire order return request
    if (order.orderStatus !== 'Return Requested') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Cannot process return for order with status ${order.orderStatus}`
      });
    }

    const now = new Date();

    if (approved) {
      // Process all return requested items
      for (const item of order.items) {
        if (item.status === 'Return Requested') {
          item.status = 'Returned';
          item.returnedAt = now;

          try {
            // Restore product stock
            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: item.quantity } }
            );
          } catch (error) {
            console.error('Error restoring stock:', error);
          }
        }
      }

      // Update order status - simplified
      const hasActiveItems = order.items.some(i => i.status === 'Active');
      order.orderStatus = hasActiveItems ? 'Delivered' : 'Returned';

      // Process refund to wallet if payment was made
      if (order.paymentStatus === 'Paid') {
        const refundSuccess = await processReturnRefund(order.user, order);
        if (refundSuccess) {
          order.paymentStatus = hasActiveItems ? 'Partially Refunded' : 'Refunded';
        } else {
          // For returns, if refund fails, log error but don't set "Refund Processing"
          console.error(`Failed to process refund for returned items in order ${order._id}`);
          // Keep the payment status as is and let the admin retry
        }
      }

      order.returnedAt = now;
    } else {
      // Reject all return requests
      order.items.forEach(item => {
        if (item.status === 'Return Requested') {
          item.status = 'Active';
          item.returnRequestedAt = null;
          item.returnReason = null;
        }
      });

      // Reset to delivered status
      order.orderStatus = 'Delivered';
    }

    await order.save();

    return res.status(HttpStatus.OK).json({
      message: approved ? "All return requests approved" : "All return requests rejected",
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

module.exports = {
  getManageOrders,
  getOrderDetails,
  updateOrderStatus,
  updateItemStatus,
  downloadInvoice,
  approveReturnRequest
};