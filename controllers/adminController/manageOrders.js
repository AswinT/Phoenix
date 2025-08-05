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
    const validStatuses = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Pending Payment'];
    let status = req.query.status || '';
    if (status === 'Pending') status = 'Placed';
    if (status && validStatuses.includes(status)) {
      query.orderStatus = status;
    }
    const validPaymentMethods = ['COD', 'UPI', 'Card', 'Wallet'];
    let payment = req.query.payment || '';
    if (payment === 'CARD') payment = 'Card';
    if (payment === 'UPI') payment = 'UPI';
    if (payment && validPaymentMethods.includes(payment)) {
      query.paymentMethod = payment;
    }
    const minAmount = Number.parseFloat(req.query.min_amount) || 0;
    const maxAmount = Number.parseFloat(req.query.max_amount) || Number.POSITIVE_INFINITY;
    if (minAmount > 0 || maxAmount < Number.POSITIVE_INFINITY) {
      query.total = {};
      if (minAmount > 0) query.total.$gte = minAmount;
      if (maxAmount < Number.POSITIVE_INFINITY) query.total.$lte = maxAmount;
    }
    const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;
    if (startDate && !isNaN(startDate)) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$gte = startDate;
    }
    if (endDate && !isNaN(endDate)) {
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = endDate;
    }
    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalPages = Math.ceil(totalOrders / limit);
    orders.forEach((order) => {
      order.formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      order.formattedTotal = `₹${order.total.toFixed(2)}`;
      order.customerName = order.user ? order.user.fullName : 'Unknown';
    });
    const pagination = {
      currentPage: page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
    };
    const filters = {
      status: status || '',
      payment: payment || '',
      min_amount: req.query.min_amount || '',
      max_amount: req.query.max_amount || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
    };
    res.render('manage-orders', {
      orders,
      pagination,
      title: 'Manage Orders',
      filters,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.redirect('/admin/dashboard');
  }
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
      primary: '#2563EB',
      secondary: '#6B7280',
      dark: '#111827',
      light: '#F8FAFC',
      success: '#059669',
      danger: '#DC2626',
      border: '#E5E7EB',
      accent: '#7C3AED'
    };
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;
    try {
      doc.image(path.join(__dirname, '../../public/assets/phoenix-logo.png'), leftMargin, 50, { width: 50 });
    } catch {
    }
    doc.font('Helvetica-Bold')
      .fontSize(28)
      .fillColor(colors.primary)
      .text('PHOENIX', leftMargin + 70, 50);
    doc.font('Helvetica-Oblique')
      .fontSize(11)
      .fillColor(colors.secondary)
      .text('Premium Headphone Experience', leftMargin + 70, 82);
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(colors.secondary)
      .text('Email: support@phoenix.com | Phone: +91 1234567890', leftMargin + 70, 98)
      .text('Website: www.phoenix.com', leftMargin + 70, 110);
    doc.strokeColor(colors.primary)
      .lineWidth(2)
      .moveTo(leftMargin + 70, 125)
      .lineTo(leftMargin + 250, 125)
      .stroke();
    const invoiceBoxX = rightMargin - 180;
    const invoiceBoxY = 50;
    const invoiceBoxWidth = 170;
    const invoiceBoxHeight = 100;
    doc.fillColor(colors.light)
      .rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight)
      .fill();
    doc.strokeColor(colors.primary)
      .lineWidth(2)
      .rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight)
      .stroke();
    doc.font('Helvetica-Bold')
      .fontSize(26)
      .fillColor(colors.primary)
      .text('INVOICE', invoiceBoxX + 10, invoiceBoxY + 15, { align: 'center', width: invoiceBoxWidth - 20 });
    const detailsStartY = invoiceBoxY + 40;
    const lineHeight = 18;
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor(colors.secondary)
      .text('Invoice Number: ', invoiceBoxX + 10, detailsStartY, { continued: true })
      .font('Helvetica-Bold')
      .fillColor(colors.dark)
      .text(`#${order.orderNumber}`);
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(colors.secondary)
      .text('Date: ', invoiceBoxX + 10, detailsStartY + lineHeight, { continued: true })
      .font('Helvetica-Bold')
      .fillColor(colors.dark)
      .text(`${order.formattedDate}`);
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
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(leftMargin, 160)
      .lineTo(rightMargin, 160)
      .stroke();
    const billingStartY = 180;
    const billingBoxWidth = 250;
    const billingBoxHeight = 120;
    doc.fillColor('#FAFBFC')
      .rect(leftMargin, billingStartY, billingBoxWidth, billingBoxHeight)
      .fill();
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .rect(leftMargin, billingStartY, billingBoxWidth, billingBoxHeight)
      .stroke();
    doc.font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(colors.primary)
      .text('BILL TO', leftMargin + 10, billingStartY + 10);
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
    const paymentBoxX = rightMargin - 200;
    const paymentBoxWidth = 190;
    const paymentBoxHeight = 80;
    doc.fillColor('#F0F9FF')
      .rect(paymentBoxX, billingStartY, paymentBoxWidth, paymentBoxHeight)
      .fill();
    doc.strokeColor(colors.primary)
      .lineWidth(1)
      .rect(paymentBoxX, billingStartY, paymentBoxWidth, paymentBoxHeight)
      .stroke();
    doc.font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(colors.primary)
      .text('PAYMENT DETAILS', paymentBoxX + 10, billingStartY + 10);
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(colors.secondary)
      .text('Method:', paymentBoxX + 10, billingStartY + 35)
      .font('Helvetica-Bold')
      .fillColor(colors.dark)
      .text(`${order.paymentMethod || 'Cash on Delivery'}`, paymentBoxX + 10, billingStartY + 50);
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(colors.secondary)
      .text('Status:', paymentBoxX + 100, billingStartY + 35);
    const paymentStatusColor = order.paymentStatus === 'Paid' ? colors.success :
      order.paymentStatus === 'Pending' ? '#F59E0B' : colors.danger;
    doc.font('Helvetica-Bold')
      .fillColor(paymentStatusColor)
      .text(`${order.paymentStatus || 'Pending'}`, paymentBoxX + 100, billingStartY + 50);
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(leftMargin, billingStartY + 140)
      .lineTo(rightMargin, billingStartY + 140)
      .stroke();
    const tableTop = billingStartY + 160;
    const tableHeaders = ['Headphone', 'Price', 'Quantity', 'Discount', 'Total'];
    const colWidths = [0.40, 0.15, 0.15, 0.15, 0.15];
    const colPositions = [];
    let currentPosition = leftMargin;
    colWidths.forEach(width => {
      colPositions.push(currentPosition);
      currentPosition += width * contentWidth;
    });
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
    let y = tableTop + 25;
    order.items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.fillColor('#F9FAFB')
          .rect(leftMargin, y, contentWidth, 35)
          .fill();
      }
      doc.fillColor(colors.dark)
        .font('Helvetica')
        .fontSize(10);
      let itemTitle = item.model || item.title || 'Unknown Product';
      if (item.status !== 'Active') {
        itemTitle += ` (${item.status})`;
      }
      doc.text(itemTitle, colPositions[0] + 5, y + 5, {
        width: colWidths[0] * contentWidth - 10,
        align: 'left'
      });
      if (item.offerTitle) {
        doc.fillColor(colors.success)
          .fontSize(8)
          .text(item.offerTitle, colPositions[0] + 5, y + 20, {
            width: colWidths[0] * contentWidth - 10,
            align: 'left'
          });
      }
      doc.fillColor(colors.dark)
        .fontSize(10)
        .text(`₹${item.price.toFixed(2)}`, colPositions[1] + 5, y + 12, {
          width: colWidths[1] * contentWidth - 10,
          align: 'right'
        });
      doc.text(item.quantity.toString(), colPositions[2] + 5, y + 12, {
        width: colWidths[2] * contentWidth - 10,
        align: 'right'
      });
      const itemDiscount = (item.offerDiscount || 0) * item.quantity;
      doc.fillColor(colors.success)
        .text(`₹${itemDiscount.toFixed(2)}`, colPositions[3] + 5, y + 12, {
          width: colWidths[3] * contentWidth - 10,
          align: 'right'
        });
      const itemTotal = (item.discountedPrice || item.price) * item.quantity;
      doc.fillColor(colors.dark)
        .text(`₹${itemTotal.toFixed(2)}`, colPositions[4] + 5, y + 12, {
          width: colWidths[4] * contentWidth - 10,
          align: 'right'
        });
      y += 35;
    });
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .rect(leftMargin, tableTop, contentWidth, y - tableTop)
      .stroke();
    let lineY = tableTop + 25;
    for (let i = 0; i < order.items.length; i++) {
      doc.moveTo(leftMargin, lineY)
        .lineTo(rightMargin, lineY)
        .stroke();
      lineY += 35;
    }
    colPositions.forEach((x, i) => {
      if (i === 0) return;
      doc.moveTo(x, tableTop)
        .lineTo(x, y)
        .stroke();
    });
    const summaryStartY = y + 20;
    const summaryWidth = 200;
    const summaryX = rightMargin - summaryWidth;
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(colors.secondary)
      .text('Subtotal:', summaryX, summaryStartY, { width: 100, align: 'left' })
      .fillColor(colors.dark)
      .text(`₹${displaySubtotal.toFixed(2)}`, summaryX + 100, summaryStartY, { width: 100, align: 'right' });
    doc.fillColor(colors.secondary)
      .text('Tax (8%):', summaryX, summaryStartY + 20, { width: 100, align: 'left' })
      .fillColor(colors.dark)
      .text(`₹${(order.tax || 0).toFixed(2)}`, summaryX + 100, summaryStartY + 20, { width: 100, align: 'right' });
    if (order.discount > 0) {
      doc.fillColor(colors.secondary)
        .text('Offer Discount:', summaryX, summaryStartY + 40, { width: 100, align: 'left' })
        .fillColor(colors.success)
        .text(`- ₹${order.discount.toFixed(2)}`, summaryX + 100, summaryStartY + 40, { width: 100, align: 'right' });
    }
    if (order.couponDiscount && order.couponDiscount > 0) {
      const yPos = order.discount > 0 ? summaryStartY + 60 : summaryStartY + 40;
      doc.fillColor(colors.secondary)
        .text(`Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}:`, summaryX, yPos, { width: 100, align: 'left' })
        .fillColor(colors.success)
        .text(`- ₹${order.couponDiscount.toFixed(2)}`, summaryX + 100, yPos, { width: 100, align: 'right' });
    }
    const totalY = summaryStartY + (order.discount > 0 ? 80 : 60);
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
    const footerY = Math.max(y + 200, totalY + 100);
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(leftMargin, footerY - 30)
      .lineTo(rightMargin, footerY - 30)
      .stroke();
    const footerBoxHeight = 60;
    doc.fillColor(colors.light)
      .rect(leftMargin, footerY - 10, contentWidth, footerBoxHeight)
      .fill();
    doc.strokeColor(colors.border)
      .lineWidth(1)
      .rect(leftMargin, footerY - 10, contentWidth, footerBoxHeight)
      .stroke();
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(colors.primary)
      .text('Thank you for choosing Phoenix!', leftMargin, footerY + 5, { align: 'center', width: contentWidth });
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(colors.secondary)
      .text('This is a computer-generated invoice and does not require a signature.', leftMargin, footerY + 25, { align: 'center', width: contentWidth })
      .text('For any queries, contact us at support@phoenix.com or +91 9876543210', leftMargin, footerY + 38, { align: 'center', width: contentWidth });
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
module.exports = {
  getManageOrders,
  getOrderDetails,
  updateOrderStatus,
  updateItemStatus,
  downloadInvoice,
  approveReturnRequest
};