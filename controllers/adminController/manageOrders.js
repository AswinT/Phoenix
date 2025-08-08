const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const { processReturnRefund } = require('../userController/walletController');
const { calculateExactRefundAmount } = require('../../helpers/moneyCalculator');
const { HttpStatus } = require('../../helpers/statusCode');
const getManageOrders = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = { isDeleted: false };

    // Validate and process filters
    const filterErrors = [];

    // Status filter
    const validStatuses = [
      'Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled',
      'Returned', 'Pending Payment', 'Partially Cancelled',
      'Partially Returned', 'Return Requested', 'Partially Return Requested'
    ];
    let status = req.query.status || '';
    if (status && !validStatuses.includes(status)) {
      filterErrors.push('Invalid order status');
    } else if (status) {
      query.orderStatus = status;
    }

    // Payment method filter
    const validPaymentMethods = ['COD', 'UPI', 'Card', 'Wallet'];
    let payment = req.query.payment || '';
    if (payment && !validPaymentMethods.includes(payment)) {
      filterErrors.push('Invalid payment method');
    } else if (payment) {
      query.paymentMethod = payment;
    }

    // Amount range filter with validation
    const minAmount = req.query.min_amount ? Number.parseFloat(req.query.min_amount) : null;
    const maxAmount = req.query.max_amount ? Number.parseFloat(req.query.max_amount) : null;

    if (minAmount !== null && (isNaN(minAmount) || minAmount < 0)) {
      filterErrors.push('Invalid minimum amount');
    }
    if (maxAmount !== null && (isNaN(maxAmount) || maxAmount < 0)) {
      filterErrors.push('Invalid maximum amount');
    }
    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
      filterErrors.push('Minimum amount cannot be greater than maximum amount');
    }

    if (minAmount !== null || maxAmount !== null) {
      query.total = {};
      if (minAmount !== null && minAmount > 0) query.total.$gte = minAmount;
      if (maxAmount !== null) query.total.$lte = maxAmount;
    }

    // Date range filter with validation
    const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (startDate && isNaN(startDate.getTime())) {
      filterErrors.push('Invalid start date');
    }
    if (endDate && isNaN(endDate.getTime())) {
      filterErrors.push('Invalid end date');
    }
    if (startDate && endDate && startDate > endDate) {
      filterErrors.push('Start date cannot be after end date');
    }
    if (startDate && startDate > today) {
      filterErrors.push('Start date cannot be in the future');
    }
    if (endDate && endDate > today) {
      filterErrors.push('End date cannot be in the future');
    }

    if (startDate && !isNaN(startDate.getTime())) {
      startDate.setHours(0, 0, 0, 0);
      query.createdAt = query.createdAt || {};
      query.createdAt.$gte = startDate;
    }
    if (endDate && !isNaN(endDate.getTime())) {
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = endDate;
    }

    // If there are filter errors, return with error message
    if (filterErrors.length > 0) {
      return res.render('manage-orders', {
        orders: [],
        pagination: { currentPage: 1, totalPages: 0, hasPrev: false, hasNext: false, pages: [] },
        title: 'Manage Orders',
        filters: {
          status: status || '',
          payment: payment || '',
          min_amount: req.query.min_amount || '',
          max_amount: req.query.max_amount || '',
          start_date: req.query.start_date || '',
          end_date: req.query.end_date || '',
        },
        filterErrors
      });
    }
    // Execute query and get results
    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalOrders / limit);

    // Format order data
    orders.forEach((order) => {
      order.formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      order.formattedTotal = `₹${order.total.toFixed(2)}`;
      order.customerName = order.user ? order.user.fullName : 'Unknown';
      order.customerEmail = order.user ? order.user.email : 'N/A';

      // Add status badge class for styling
      order.statusClass = getStatusClass(order.orderStatus);
    });

    // Build pagination
    const pagination = {
      currentPage: page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      totalOrders
    };

    // Prepare filter data
    const filters = {
      status: status || '',
      payment: payment || '',
      min_amount: req.query.min_amount || '',
      max_amount: req.query.max_amount || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
    };

    // Check if any filters are applied
    const hasActiveFilters = Object.values(filters).some(value => value !== '');

    res.render('manage-orders', {
      orders,
      pagination,
      title: 'Manage Orders',
      filters,
      hasActiveFilters,
      totalOrders,
      filterErrors: []
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.render('manage-orders', {
      orders: [],
      pagination: { currentPage: 1, totalPages: 0, hasPrev: false, hasNext: false, pages: [], totalOrders: 0 },
      title: 'Manage Orders',
      filters: {
        status: '',
        payment: '',
        min_amount: '',
        max_amount: '',
        start_date: '',
        end_date: '',
      },
      hasActiveFilters: false,
      totalOrders: 0,
      filterErrors: ['An error occurred while fetching orders. Please try again.']
    });
  }
};

// Helper function to get status class for styling
const getStatusClass = (status) => {
  const statusClasses = {
    'Placed': 'badge-warning',
    'Processing': 'badge-info',
    'Shipped': 'badge-primary',
    'Delivered': 'badge-success',
    'Cancelled': 'badge-danger',
    'Returned': 'badge-secondary',
    'Pending Payment': 'badge-warning',
    'Partially Cancelled': 'badge-warning',
    'Partially Returned': 'badge-warning',
    'Return Requested': 'badge-info',
    'Partially Return Requested': 'badge-info'
  };
  return statusClasses[status] || 'badge-secondary';
};
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
      return res.redirect('/admin/orders');
    }
    order.formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    order.items = order.items.map(item => {
      const originalPrice = Number(item.price);
      const quantity = Number(item.quantity || 1);
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
        item.formattedOriginalPrice = `₹${breakdown.originalPrice.toFixed(2)}`;
        item.formattedPriceAfterOffer = `₹${breakdown.priceAfterOffer.toFixed(2)}`;
        item.formattedFinalPrice = `₹${breakdown.finalPrice.toFixed(2)}`;
        item.totalOriginalPrice = breakdown.originalPrice * quantity;
        item.totalPriceAfterOffer = breakdown.priceAfterOffer * quantity;
        item.totalFinalPrice = breakdown.finalPrice * quantity;
        item.totalOfferSavings = breakdown.offerDiscount * quantity;
        item.totalCouponSavings = breakdown.couponDiscount * quantity;
        item.formattedTotalOriginalPrice = `₹${item.totalOriginalPrice.toFixed(2)}`;
        item.formattedTotalFinalPrice = `₹${item.totalFinalPrice.toFixed(2)}`;
        if (breakdown.offerDiscount > 0) {
          const offerSavingPercent = (breakdown.offerDiscount / breakdown.originalPrice) * 100;
          item.offerSavingText = `Save ${offerSavingPercent.toFixed(0)}% with ${breakdown.offerTitle}`;
        }
        if (item.status === 'Cancelled' || item.status === 'Returned') {
          const shouldShowRefund = (
            (order.paymentMethod === 'COD' && order.orderStatus === 'Delivered' && item.status === 'Returned') ||
            (order.paymentMethod !== 'COD' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded'))
          );
          if (shouldShowRefund) {
            item.refundAmount = calculateExactRefundAmount(item, order);
            item.formattedRefund = `₹${item.refundAmount.toFixed(2)}`;
            item.taxAmount = 0;
            item.formattedTaxAmount = null;
          } else {
            item.refundAmount = 0;
            item.formattedRefund = null;
            item.taxAmount = 0;
            item.formattedTaxAmount = null;
          }
        }
      } else {
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
        if (item.status === 'Cancelled' || item.status === 'Returned') {
          const shouldShowRefund = (
            (order.paymentMethod === 'COD' && order.orderStatus === 'Delivered' && item.status === 'Returned') ||
            (order.paymentMethod !== 'COD' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded'))
          );
          if (shouldShowRefund) {
            item.refundAmount = calculateExactRefundAmount(item, order);
            item.formattedRefund = `₹${item.refundAmount.toFixed(2)}`;
            item.taxAmount = 0;
            item.formattedTaxAmount = null;
          } else {
            item.refundAmount = 0;
            item.formattedRefund = null;
            item.taxAmount = 0;
            item.formattedTaxAmount = null;
          }
        }
      }
      return item;
    });
    const totals = {
      subtotal: 0,
      offerDiscount: 0,
      couponDiscount: 0,
      tax: Number(order.tax || 0),
      shipping: Number(order.shipping || 0),
      totalRefunded: 0
    };
    order.items.forEach(item => {
      if (item.priceBreakdown) {
        totals.subtotal += item.totalOriginalPrice;
        totals.offerDiscount += item.totalOfferSavings;
        totals.couponDiscount += item.totalCouponSavings;
        if (item.status === 'Cancelled' || item.status === 'Returned') {
          if (item.refundAmount && item.refundAmount > 0) {
            totals.totalRefunded += item.refundAmount;
          }
        }
      } else {
        totals.subtotal += item.totalOriginalPrice;
        totals.offerDiscount += (item.totalOriginalPrice - item.totalDiscountedPrice);
        if (item.status === 'Cancelled' || item.status === 'Returned') {
          if (item.refundAmount && item.refundAmount > 0) {
            totals.totalRefunded += item.refundAmount;
          }
        }
      }
    });
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
    const correctTotal = displaySubtotal - (order.discount || 0) - (order.couponDiscount || 0) + (order.tax || 0);
    const useStoredTotal = order.total && Math.abs(order.total - correctTotal) < 0.01;
    const displayTotal = useStoredTotal ? order.total : correctTotal;
    order.total = displayTotal;
    order.formattedSubtotal = `₹${displaySubtotal.toFixed(2)}`;
    order.formattedOfferDiscount = totals.offerDiscount > 0 ? `₹${totals.offerDiscount.toFixed(2)}` : null;
    order.formattedCouponDiscount = totals.couponDiscount > 0 ? `₹${totals.couponDiscount.toFixed(2)}` : null;
    order.formattedTax = `₹${totals.tax.toFixed(2)}`;
    order.formattedShipping = totals.shipping > 0 ? `₹${totals.shipping.toFixed(2)}` : 'Free';
    order.formattedTotal = `₹${displayTotal.toFixed(2)}`;
    order.formattedTotalRefunded = totals.totalRefunded > 0 ? `₹${totals.totalRefunded.toFixed(2)}` : null;
    const hasActiveItems = order.items.some(item =>
      item.status !== 'Cancelled' && item.status !== 'Returned'
    );
    const hasReturnRequestedItems = order.items.some(item =>
      item.status === 'Return Requested'
    );
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
    res.redirect('/admin/orders');
  }
};
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, itemId } = req.body;
    const validStatuses = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Return Requested'];
    if (!validStatuses.includes(status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Invalid status value' });
    }
    const order = await Order.findById(orderId);
    if (!order || order.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found' });
    }
    if (itemId) {
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Item not found in order' });
      }
      const itemStatusTransitions = {
        'Active': ['Cancelled', 'Returned'],
        'Cancelled': [],
        'Returned': []
      };
      const allowedItemStatuses = itemStatusTransitions[item.status] || [];
      if (!allowedItemStatuses.includes(status)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: `Cannot update item status from ${item.status} to ${status}`
        });
      }
      const now = new Date();
      item.status = status;
      if (status === 'Cancelled') {
        item.cancelledAt = now;
        item.cancellationReason = 'Cancelled by admin';
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      } else if (status === 'Returned') {
        item.returnedAt = now;
        item.returnReason = 'Returned by admin';
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
      const hasActiveItems = order.items.some(i => i.status === 'Active');
      const hasCancelledItems = order.items.some(i => i.status === 'Cancelled');
      const hasReturnedItems = order.items.some(i => i.status === 'Returned');
      if (!hasActiveItems) {
        if (hasReturnedItems && !hasCancelledItems) {
          order.orderStatus = 'Returned';
        } else if (hasCancelledItems && !hasReturnedItems) {
          order.orderStatus = 'Cancelled';
        } else if (hasReturnedItems && hasCancelledItems) {
          order.orderStatus = 'Partially Returned';
        }
      } else {
        if (hasReturnedItems && hasCancelledItems) {
          order.orderStatus = 'Partially Returned';
        } else if (hasReturnedItems) {
          order.orderStatus = 'Partially Returned';
        } else if (hasCancelledItems) {
          order.orderStatus = 'Partially Cancelled';
        }
      }
      await order.save();
      return res.status(HttpStatus.OK).json({ success: true, message: 'Item status updated successfully' });
    }
    const statusTransitions = {
      Placed: ['Processing', 'Cancelled'],
      Processing: ['Shipped', 'Cancelled'],
      Shipped: ['Delivered'],
      'Partially Cancelled': ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
      'Pending Payment': ['Cancelled'],
      Delivered: [],
      Cancelled: [],
      Returned: [],
      'Partially Returned': [],
      'Return Requested': [],
      'Partially Return Requested': [],
    };
    const allowedStatuses = statusTransitions[order.orderStatus] || [];
    if (!allowedStatuses.includes(status)) {
      let errorMessage = '';
      if (order.orderStatus.includes('Return')) {
        errorMessage = 'This order has return requests. Please use the Return Management page to handle returns.';
      } else if (order.orderStatus === 'Delivered') {
        errorMessage = 'This order has been delivered successfully. No further status updates are needed.';
      } else if (['Cancelled', 'Returned', 'Partially Cancelled', 'Partially Returned'].includes(order.orderStatus)) {
        errorMessage = `Cannot update status from ${order.orderStatus} - this is a terminal state.`;
      } else {
        errorMessage = `Cannot transition from ${order.orderStatus} to ${status}. Allowed transitions: ${allowedStatuses.join(', ') || 'None'}`;
      }
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
    const now = new Date();
    order.orderStatus = status;
    if (order.orderStatus === 'Partially Cancelled' || order.orderStatus === 'Partially Returned') {
      if (status === 'Cancelled') {
        order.items.forEach((item) => {
          if (item.status === 'Active') {
            item.status = 'Cancelled';
            item.cancelledAt = now;
            item.cancellationReason = 'Cancelled by admin';
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: item.quantity } }
            ).catch(err => console.error('Error updating product stock:', err));
          }
        });
      }
    } else if (status === 'Cancelled') {
      order.items.forEach((item) => {
        if (item.status === 'Active') {
          item.status = 'Cancelled';
          item.cancelledAt = now;
          item.cancellationReason = 'Cancelled by admin';
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
          ).catch(err => console.error('Error updating product stock:', err));
        }
      });
    }
    if (status === 'Processing') {
      order.processedAt = now;
    } else if (status === 'Shipped') {
      order.shippedAt = now;
      if (!order.processedAt) {
        order.processedAt = order.createdAt;
      }
    } else if (status === 'Delivered') {
      order.deliveredAt = now;
      if (!order.processedAt) {
        order.processedAt = order.createdAt;
      }
      if (!order.shippedAt) {
        order.shippedAt = new Date(order.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      }
      if (order.paymentMethod === 'COD') {
        order.paymentStatus = 'Paid';
      }
    } else if (status === 'Cancelled') {
      order.cancelledAt = now;
      if (order.paymentMethod === 'COD') {
        order.paymentStatus = 'Failed';
      } else if (order.paymentStatus === 'Paid') {
        order.paymentStatus = 'Refund Initiated';
      } else if (order.paymentStatus === 'Pending') {
        order.paymentStatus = 'Failed';
      }
    }
    await order.save();
    res.status(HttpStatus.OK).json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to update order status' });
  }
};
const updateItemStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const itemId = req.params.itemId;
    const { status, reason } = req.body;
    const validStatuses = ['Cancelled', 'Returned'];
    if (!validStatuses.includes(status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid status value' });
    }
    const order = await Order.findById(orderId);
    if (!order || order.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Order not found' });
    }
    const item = order.items.id(itemId);
    if (!item) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Item not found in order' });
    }
    if (item.status !== 'Active') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Item cannot be ${status.toLowerCase()} in its current state (${item.status})`
      });
    }
    const now = new Date();
    item.status = status;
    if (status === 'Cancelled') {
      item.cancelledAt = now;
      item.cancellationReason = reason || 'Cancelled by admin';
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    } else if (status === 'Returned') {
      item.returnedAt = now;
      item.returnReason = reason || 'Returned by admin';
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }
    const hasActiveItems = order.items.some(i => i.status === 'Active');
    const hasCancelledItems = order.items.some(i => i.status === 'Cancelled');
    const hasReturnedItems = order.items.some(i => i.status === 'Returned');
    const hasReturnRequestedItems = order.items.some(i => i.status === 'Return Requested');
    if (!hasActiveItems && !hasReturnRequestedItems) {
      if (hasReturnedItems && hasCancelledItems) {
        order.orderStatus = 'Partially Returned';
      } else if (hasReturnedItems) {
        order.orderStatus = 'Returned';
      } else if (hasCancelledItems) {
        order.orderStatus = 'Cancelled';
      }
    } else if (hasCancelledItems || hasReturnedItems) {
      if (hasCancelledItems && hasReturnedItems) {
        order.orderStatus = 'Partially Returned';
      } else if (hasCancelledItems) {
        order.orderStatus = 'Partially Cancelled';
      } else if (hasReturnedItems) {
        order.orderStatus = 'Partially Returned';
      }
    } else if (hasReturnRequestedItems && hasActiveItems) {
      order.orderStatus = 'Partially Return Requested';
    } else if (hasReturnRequestedItems && !hasActiveItems) {
      order.orderStatus = 'Return Requested';
    }
    if (status === 'Cancelled' || status === 'Returned') {
      if (order.paymentMethod === 'COD') {
        const wasDeliveredAndPaid = order.paymentStatus === 'Paid' ||
                                    order.orderStatus === 'Delivered' ||
                                    order.deliveredAt ||
                                    order.items.some(item =>
                                      item.status === 'Delivered' ||
                                      item.status === 'Returned' ||
                                      (item.status === 'Active' && order.orderStatus === 'Delivered')
                                    );
        if (wasDeliveredAndPaid) {
          if (!hasActiveItems && !hasReturnRequestedItems) {
            order.paymentStatus = status === 'Cancelled' ? 'Refunded' : 'Refunded';
          } else {
            order.paymentStatus = 'Partially Refunded';
          }
        } else {
          if (!hasActiveItems && !hasReturnRequestedItems) {
            order.paymentStatus = 'Failed';
          }
        }
      } else {
        if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded') {
          if (!hasActiveItems && !hasReturnRequestedItems) {
            order.paymentStatus = 'Refunded';
          } else {
            order.paymentStatus = 'Partially Refunded';
          }
        } else if (order.paymentStatus === 'Pending' && !hasActiveItems && !hasReturnRequestedItems) {
          order.paymentStatus = 'Failed';
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
    console.error('Error updating item status:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
};
const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({
      _id: orderId,
      isDeleted: false,
    }).populate('items.product');
    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).send('Order not found');
    }
    const user = await User.findById(order.user, 'fullName email').lean();
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).send('User not found');
    }
    order.formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
    const correctTotal = displaySubtotal - (order.discount || 0) - (order.couponDiscount || 0) + (order.tax || 0);
    const useStoredTotal = order.total && Math.abs(order.total - correctTotal) < 0.01;
    const displayTotal = useStoredTotal ? order.total : correctTotal;
    order.formattedTotal = `₹${displayTotal.toFixed(2)}`;
    order.formattedSubtotal = `₹${displaySubtotal.toFixed(2)}`;
    order.formattedTax = `₹${(order.tax || 0).toFixed(2)}`;
    order.formattedDiscount = order.discount ? `₹${order.discount.toFixed(2)}` : '₹0.00';
    order.formattedCouponDiscount = order.couponDiscount ? `₹${order.couponDiscount.toFixed(2)}` : '₹0.00';
    order.total = displayTotal;
    order.items.forEach((item) => {
      item.formattedPrice = `₹${item.price.toFixed(2)}`;
      item.formattedDiscountedPrice = item.discountedPrice ? `₹${item.discountedPrice.toFixed(2)}` : item.formattedPrice;
      item.formattedOfferDiscount = item.offerDiscount ? `₹${item.offerDiscount.toFixed(2)}` : '₹0.00';
    });
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
    });
    const filename = `invoice-${order.orderNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    const colors = {
      primary: '#000000',
      secondary: '#666666',
      dark: '#000000',
      light: '#FFFFFF',
      success: '#155724',
      danger: '#DC2626',
      border: '#E0E0E0',
      accent: '#000000'
    };
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;
    // Company branding (no logo, just text like web view)
    doc.font('Helvetica-Bold')
      .fontSize(28)
      .fillColor(colors.primary)
      .text('Phoenix', leftMargin, 50);

    doc.font('Helvetica')
      .fontSize(11)
      .fillColor(colors.secondary)
      .text('Premium Headphone Experience', leftMargin, 82);

    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(colors.secondary)
      .text('Email: support@phoenix.com | Phone: +91 1234567890', leftMargin, 98)
      .text('Website: www.phoenix.com', leftMargin, 110);

    // Clean line separator
    doc.strokeColor(colors.primary)
      .lineWidth(2)
      .moveTo(leftMargin, 125)
      .lineTo(pageWidth - 50, 125)
      .stroke();
    // Invoice title (right-aligned like web view)
    const invoiceBoxX = rightMargin - 150;
    const invoiceBoxY = 50;

    doc.font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(colors.primary)
      .text('INVOICE', invoiceBoxX, invoiceBoxY, { align: 'right', width: 150 });
    // Invoice number below title
    doc.font('Helvetica')
      .fontSize(12)
      .fillColor(colors.secondary)
      .text(`Invoice #${order.orderNumber}`, invoiceBoxX, invoiceBoxY + 30, { align: 'right', width: 150 });

    // Invoice Details Section (like web view)
    const detailsStartY = 160;
    const leftColumnX = leftMargin;
    const rightColumnX = leftMargin + (contentWidth / 2) + 20;

    // Bill To section
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(colors.primary)
      .text('BILL TO', leftColumnX, detailsStartY);

    let currentY = detailsStartY + 20;
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(colors.secondary)
      .text('Name:', leftColumnX, currentY, { continued: true })
      .fillColor(colors.dark)
      .text(` ${order.shippingAddress.fullName || 'N/A'}`);

    currentY += 15;
    doc.fillColor(colors.secondary)
      .text('Email:', leftColumnX, currentY, { continued: true })
      .fillColor(colors.dark)
      .text(` ${user.email || ''}`);

    currentY += 15;
    doc.fillColor(colors.secondary)
      .text('Address:', leftColumnX, currentY);

    currentY += 15;
    const addressLines = [];
    if (order.shippingAddress.street) addressLines.push(order.shippingAddress.street);
    if (order.shippingAddress.landmark) addressLines.push(order.shippingAddress.landmark);
    if (order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.pinCode) {
      addressLines.push(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.pinCode || ''}`);
    }
    if (order.shippingAddress.country) addressLines.push(order.shippingAddress.country);

    addressLines.forEach(line => {
      doc.fillColor(colors.dark)
        .text(line, leftColumnX + 10, currentY);
      currentY += 12;
    });

    // Invoice Details section (right column)
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(colors.primary)
      .text('INVOICE DETAILS', rightColumnX, detailsStartY);

    currentY = detailsStartY + 20;
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(colors.secondary)
      .text('Date:', rightColumnX, currentY, { continued: true })
      .fillColor(colors.dark)
      .text(` ${order.formattedDate}`);

    currentY += 15;
    doc.fillColor(colors.secondary)
      .text('Payment Status:', rightColumnX, currentY, { continued: true });

    const statusColor = order.paymentStatus === 'Paid' || order.orderStatus === 'Delivered' ? colors.success : colors.secondary;
    doc.fillColor(statusColor)
      .text(` ${order.paymentStatus || 'Pending'}`);

    if (order.orderStatus) {
      currentY += 15;
      doc.fillColor(colors.secondary)
        .text('Order Status:', rightColumnX, currentY, { continued: true })
        .fillColor(colors.dark)
        .text(` ${order.orderStatus}`);
    }

    currentY += 15;
    doc.fillColor(colors.secondary)
      .text('Payment Method:', rightColumnX, currentY, { continued: true })
      .fillColor(colors.dark)
      .text(` ${order.paymentMethod === 'COD' ? 'Cash on Delivery' :
              order.paymentMethod === 'Razorpay' ? 'Online Payment' :
              order.paymentMethod || 'Cash on Delivery'}`);
    // Table starts after the details section
    const tableTop = Math.max(currentY + 30, 300);
    // Add border around table like web view
    doc.strokeColor(colors.primary)
      .lineWidth(1)
      .rect(leftMargin, tableTop, contentWidth, 25)
      .stroke();
    const tableHeaders = ['Product', 'Qty', 'Unit Price', 'Total'];
    const colWidths = [0.50, 0.15, 0.20, 0.15];
    const colPositions = [];
    let currentPosition = leftMargin;
    colWidths.forEach(width => {
      colPositions.push(currentPosition);
      currentPosition += width * contentWidth;
    });

    // Black header background (matching web view)
    doc.fillColor(colors.primary)
      .rect(leftMargin, tableTop, contentWidth, 25)
      .fill();

    // White text on black background
    doc.font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(colors.light);

    // Product header (left-aligned)
    doc.text(tableHeaders[0], colPositions[0] + 5, tableTop + 8, { width: colWidths[0] * contentWidth - 10, align: 'left' });

    // Qty header (center-aligned)
    doc.text(tableHeaders[1], colPositions[1] + 5, tableTop + 8, { width: colWidths[1] * contentWidth - 10, align: 'center' });

    // Unit Price header (right-aligned)
    doc.text(tableHeaders[2], colPositions[2] + 5, tableTop + 8, { width: colWidths[2] * contentWidth - 10, align: 'right' });

    // Total header (right-aligned)
    doc.text(tableHeaders[3], colPositions[3] + 5, tableTop + 8, { width: colWidths[3] * contentWidth - 10, align: 'right' });
    let y = tableTop + 25;
    order.items.forEach((item, index) => {
      // Clean alternating row colors
      if (index % 2 === 1) {
        doc.fillColor('#F8F9FA')
          .rect(leftMargin, y, contentWidth, 40)
          .fill();
      }

      doc.fillColor(colors.dark)
        .font('Helvetica')
        .fontSize(10);

      // Product name and details
      let itemTitle = item.model || item.title || 'Unknown Product';
      if (item.status !== 'Active') {
        itemTitle += ` (${item.status})`;
      }
      doc.text(itemTitle, colPositions[0] + 5, y + 8, {
        width: colWidths[0] * contentWidth - 10,
        align: 'left'
      });

      // Product details (brand, type, etc.)
      if (item.brand || item.connectivity) {
        doc.fillColor(colors.secondary)
          .fontSize(8);
        let details = [];
        if (item.brand) details.push(`Brand: ${item.brand}`);
        if (item.connectivity) details.push(`Type: ${item.connectivity}`);
        doc.text(details.join(' | '), colPositions[0] + 5, y + 22, {
          width: colWidths[0] * contentWidth - 10,
          align: 'left'
        });
      }

      // Quantity
      doc.fillColor(colors.dark)
        .fontSize(10)
        .text(item.quantity.toString(), colPositions[1] + 5, y + 15, {
          width: colWidths[1] * contentWidth - 10,
          align: 'center'
        });

      // Unit Price (after discounts)
      const unitPrice = item.discountedPrice || item.price;
      doc.text(`₹${unitPrice.toFixed(2)}`, colPositions[2] + 5, y + 15, {
        width: colWidths[2] * contentWidth - 10,
        align: 'center'
      });

      // Total
      const itemTotal = unitPrice * item.quantity;
      doc.font('Helvetica-Bold')
        .text(`₹${itemTotal.toFixed(2)}`, colPositions[3] + 5, y + 15, {
          width: colWidths[3] * contentWidth - 10,
          align: 'center'
        });

      y += 40;
    });

    // Add table border like web view
    doc.strokeColor(colors.primary)
      .lineWidth(1)
      .rect(leftMargin, tableTop, contentWidth, y - tableTop)
      .stroke();
    // Summary section (matching web view)
    const summaryStartY = y + 30;
    const summaryWidth = 250;
    const summaryX = rightMargin - summaryWidth;

    let summaryCurrentY = summaryStartY;

    // Subtotal
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(colors.secondary)
      .text('Subtotal:', summaryX, summaryCurrentY, { width: 120, align: 'left' })
      .fillColor(colors.dark)
      .text(`₹${displaySubtotal.toFixed(2)}`, summaryX + 120, summaryCurrentY, { width: 120, align: 'right' });
    summaryCurrentY += 20;

    // Discounts
    if (order.discount > 0) {
      doc.fillColor(colors.secondary)
        .text('Offer Discount:', summaryX, summaryCurrentY, { width: 120, align: 'left' })
        .fillColor(colors.dark)
        .text(`-₹${order.discount.toFixed(2)}`, summaryX + 120, summaryCurrentY, { width: 120, align: 'right' });
      summaryCurrentY += 20;
    }

    if (order.couponDiscount && order.couponDiscount > 0) {
      doc.fillColor(colors.secondary)
        .text(`Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}:`, summaryX, summaryCurrentY, { width: 120, align: 'left' })
        .fillColor(colors.dark)
        .text(`-₹${order.couponDiscount.toFixed(2)}`, summaryX + 120, summaryCurrentY, { width: 120, align: 'right' });
      summaryCurrentY += 20;
    }

    // Tax
    doc.fillColor(colors.secondary)
      .text('Tax:', summaryX, summaryCurrentY, { width: 120, align: 'left' })
      .fillColor(colors.dark)
      .text(`₹${(order.tax || 0).toFixed(2)}`, summaryX + 120, summaryCurrentY, { width: 120, align: 'right' });
    summaryCurrentY += 25;
    // Total with black line separator
    doc.strokeColor(colors.primary)
      .lineWidth(2)
      .moveTo(summaryX, summaryCurrentY - 5)
      .lineTo(summaryX + 240, summaryCurrentY - 5)
      .stroke();

    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(colors.primary)
      .text('Total Amount:', summaryX, summaryCurrentY, { width: 120, align: 'left' })
      .text(`₹${order.total.toFixed(2)}`, summaryX + 120, summaryCurrentY, { width: 120, align: 'right' });
    const footerY = Math.max(y + 150, summaryCurrentY + 80);

    // Clean footer separator
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(leftMargin, footerY - 20)
      .lineTo(rightMargin, footerY - 20)
      .stroke();

    // Footer content
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(colors.primary)
      .text('Thank you for your business!', leftMargin, footerY, { align: 'center', width: contentWidth });

    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(colors.secondary)
      .text('For any questions about this invoice, please contact us at support@phoenix.com or +91 1234567890', leftMargin, footerY + 20, { align: 'center', width: contentWidth })
      .text('Phoenix - Premium Headphone Experience | www.phoenix.com', leftMargin, footerY + 35, { align: 'center', width: contentWidth })
      .text('This is a computer-generated invoice and does not require a signature.', leftMargin, footerY + 50, { align: 'center', width: contentWidth });
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
        .fillColor(colors.secondary)
        .text(`Page ${i + 1} of ${pageCount}`, leftMargin, doc.page.height - 50, { align: 'center', width: contentWidth });
    }
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Internal server error');
  }
};
const approveReturnRequest = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemId, approved } = req.body;
    const order = await Order.findById(orderId);
    if (!order || order.isDeleted) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (itemId) {
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found in order' });
      }
      if (item.status !== 'Return Requested') {
        return res.status(400).json({
          message: `Cannot process return for item with status ${item.status}`
        });
      }
      const now = new Date();
      if (approved) {
        item.status = 'Returned';
        item.returnedAt = now;
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
        if (order.paymentStatus === 'Paid') {
          const refundSuccess = await processReturnRefund(order.user, order, itemId);
          if (refundSuccess) {
            const allItemsRefunded = order.items.every(i =>
              i.status === 'Returned' || i.status === 'Cancelled'
            );
            order.paymentStatus = allItemsRefunded ? 'Refunded' : 'Partially Refunded';
          } else {
            order.paymentStatus = 'Refund Processing';
          }
        } else {
        }
      } else {
        item.status = 'Active';
        item.returnRequestedAt = null;
        item.returnReason = null;
      }
      const hasActiveItems = order.items.some(i => i.status === 'Active');
      const hasReturnRequestedItems = order.items.some(i => i.status === 'Return Requested');
      const hasCancelledItems = order.items.some(i => i.status === 'Cancelled');
      const hasReturnedItems = order.items.some(i => i.status === 'Returned');
      if (!hasActiveItems && !hasReturnRequestedItems) {
        if (hasReturnedItems && !hasCancelledItems) {
          order.orderStatus = 'Returned';
        } else if (hasCancelledItems && !hasReturnedItems) {
          order.orderStatus = 'Cancelled';
        } else {
          order.orderStatus = 'Delivered';
        }
      } else if (hasReturnRequestedItems) {
      } else {
        order.orderStatus = 'Delivered';
      }
      await order.save();
      return res.status(200).json({
        message: approved ? 'Return request approved' : 'Return request rejected',
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      });
    }
    if (order.orderStatus !== 'Return Requested') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Cannot process return for order with status ${order.orderStatus}`
      });
    }
    const now = new Date();
    if (approved) {
      for (const item of order.items) {
        if (item.status === 'Return Requested') {
          item.status = 'Returned';
          item.returnedAt = now;
          try {
            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: item.quantity } }
            );
          } catch (error) {
            console.error('Error restoring stock:', error);
          }
        }
      }
      const hasActiveItems = order.items.some(i => i.status === 'Active');
      order.orderStatus = hasActiveItems ? 'Delivered' : 'Returned';
      if (order.paymentStatus === 'Paid') {
        const refundSuccess = await processReturnRefund(order.user, order);
        if (refundSuccess) {
          order.paymentStatus = hasActiveItems ? 'Partially Refunded' : 'Refunded';
        } else {
          console.error(`Failed to process refund for returned items in order ${order._id}`);
        }
      }
      order.returnedAt = now;
    } else {
      order.items.forEach(item => {
        if (item.status === 'Return Requested') {
          item.status = 'Active';
          item.returnRequestedAt = null;
          item.returnReason = null;
        }
      });
      order.orderStatus = 'Delivered';
    }
    await order.save();
    return res.status(HttpStatus.OK).json({
      message: approved ? 'All return requests approved' : 'All return requests rejected',
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error('Error processing return request:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
};
const exportOrders = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Build query based on filters
    const query = { isDeleted: false };

    // Apply filters from query parameters
    if (req.query.status && req.query.status !== '') {
      let status = req.query.status;
      if (status === 'Pending') status = 'Placed';
      query.orderStatus = status;
    }

    if (req.query.payment && req.query.payment !== '') {
      query.paymentStatus = req.query.payment;
    }

    if (req.query.min_amount && req.query.max_amount) {
      const minAmount = parseFloat(req.query.min_amount);
      const maxAmount = parseFloat(req.query.max_amount);
      if (!isNaN(minAmount) && !isNaN(maxAmount)) {
        query.total = { $gte: minAmount, $lte: maxAmount };
      }
    } else if (req.query.min_amount) {
      const minAmount = parseFloat(req.query.min_amount);
      if (!isNaN(minAmount)) {
        query.total = { $gte: minAmount };
      }
    } else if (req.query.max_amount) {
      const maxAmount = parseFloat(req.query.max_amount);
      if (!isNaN(maxAmount)) {
        query.total = { $lte: maxAmount };
      }
    }

    if (req.query.start_date && req.query.end_date) {
      const startDate = new Date(req.query.start_date);
      const endDate = new Date(req.query.end_date);
      endDate.setHours(23, 59, 59, 999);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    // Fetch orders with populated data
    const orders = await Order.find(query)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'model brand')
      .sort({ createdAt: -1 })
      .limit(10000) // Limit to prevent memory issues
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No orders found for the selected criteria'
      });
    }

    // Prepare data for Excel export
    const excelData = orders.map(order => {
      const itemsDetails = order.items.map(item =>
        `${item.product?.brand || 'N/A'} ${item.product?.model || 'N/A'} (Qty: ${item.quantity})`
      ).join('; ');

      return {
        'Order Number': order.orderNumber,
        'Date': new Date(order.createdAt).toLocaleDateString('en-US'),
        'Customer Name': order.user?.fullName || 'Unknown',
        'Customer Email': order.user?.email || 'N/A',
        'Customer Phone': order.user?.phone || 'N/A',
        'Items': itemsDetails,
        'Total Items': order.items.reduce((sum, item) => sum + item.quantity, 0),
        'Subtotal': order.subtotal?.toFixed(2) || '0.00',
        'Offer Discount': order.offerDiscount?.toFixed(2) || '0.00',
        'Coupon Discount': order.couponDiscount?.toFixed(2) || '0.00',
        'Coupon Code': order.couponCode || 'N/A',
        'Total Amount': order.total?.toFixed(2) || '0.00',
        'Payment Method': order.paymentMethod || 'N/A',
        'Payment Status': order.paymentStatus || 'N/A',
        'Order Status': order.orderStatus || 'N/A',
        'Shipping Address': order.shippingAddress ?
          `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}` : 'N/A'
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Generate filename with current date and filters
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    let filename = `orders-export-${dateStr}`;

    if (req.query.status) filename += `-${req.query.status}`;
    if (req.query.start_date && req.query.end_date) {
      filename += `-${req.query.start_date}-to-${req.query.end_date}`;
    }
    filename += '.xlsx';

    // Set headers and send file
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to export orders: ' + error.message
    });
  }
};





module.exports = {
  getManageOrders,
  getOrderDetails,
  updateOrderStatus,
  updateItemStatus,
  downloadInvoice,
  approveReturnRequest,
  exportOrders
};