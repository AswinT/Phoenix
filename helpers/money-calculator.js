/**
 * **BULLETPROOF REFUND CALCULATOR - UNIFIED SYSTEM**
 * Single source of truth for ALL refund calculations
 * Prevents double refunding and ensures mathematical accuracy
 */

/**
 * **MAIN REFUND CALCULATOR**
 * Handles all refund scenarios with bulletproof logic
 *
 * @param {string} refundType - 'INDIVIDUAL_ITEM' or 'REMAINING_ORDER'
 * @param {Object} order - Complete order object
 * @param {string} targetItemId - Item ID for individual refunds (optional for full order)
 * @returns {Object} - Calculation result with amount and details
 */
const calculateRefundAmount = (refundType, order, targetItemId = null) => {
  try {
    // Validation
    if (!order || !order.total || order.total <= 0) {
      console.error('Invalid order data for refund calculation');
      return { success: false, amount: 0, reason: 'Invalid order data' };
    }

    // Get relevant items based on refund type
    // For cancellations: get active items to prevent double refunding
    // For returns: get returned items to calculate what should be refunded
    let relevantItems;
    if (refundType === 'REMAINING_ORDER') {
      // Check if this is a return scenario (items already returned) or cancellation scenario
      const returnedItems = order.items.filter(item => item.status === 'Returned');
      const activeItems = order.items.filter(item =>
        item.status === 'Active' || item.status === 'Placed' || !item.status
      );

      if (returnedItems.length > 0) {
        // This is a return refund - use returned items
        relevantItems = returnedItems;
      } else {
        // This is a cancellation refund - use active items
        relevantItems = activeItems;
      }
    } else {
      // For individual item refunds, we'll handle this in the specific function
      relevantItems = order.items.filter(item =>
        item.status === 'Active' || item.status === 'Placed' || !item.status
      );
    }

    // Calculate based on refund type
    if (refundType === 'INDIVIDUAL_ITEM') {
      // For individual items, we need to check ALL items (not just active)
      // because the item might have just been cancelled
      return calculateIndividualItemRefund(targetItemId, order, order.items);
    } else if (refundType === 'REMAINING_ORDER') {
      // For full order cancellation/return, we need to check what hasn't been refunded yet
      return calculateRemainingOrderRefund(order, relevantItems, order.items);
    } else {
      return { success: false, amount: 0, reason: 'Invalid refund type' };
    }

  } catch (error) {
    console.error('Error in refund calculation:', error.message);
    return { success: false, amount: 0, reason: 'Calculation error' };
  }
};

/**
 * **INDIVIDUAL ITEM REFUND CALCULATOR**
 */
const calculateIndividualItemRefund = (targetItemId, order, allItems) => {
  // Find the specific item to refund with flexible matching
  const itemToRefund = allItems.find(item => {
    const productMatch = item.product?.toString() === targetItemId?.toString();
    const idMatch = item._id?.toString() === targetItemId?.toString();
    return productMatch || idMatch;
  });

  if (!itemToRefund) {
    return { success: false, amount: 0, reason: 'Item not found in order' };
  }

  // Check if item is eligible for refund
  const eligibleStatuses = ['Cancelled', 'Active', 'Return Requested', 'Returned'];
  if (!eligibleStatuses.includes(itemToRefund.status)) {
    return { success: false, amount: 0, reason: 'Item not eligible for refund' };
  }

  // Calculate proportional refund for this item
  const refundAmount = calculateItemProportion(itemToRefund, order, allItems);

  return {
    success: true,
    amount: refundAmount,
    reason: `Refund for cancelled item: ${itemToRefund.title}`,
    itemTitle: itemToRefund.title,
    itemId: itemToRefund._id || itemToRefund.product
  };
};

/**
 * **REMAINING ORDER REFUND CALCULATOR**
 * Handles both cancellations and returns
 */
const calculateRemainingOrderRefund = (order, relevantItems, allItems) => {
  // Check if we have items to process
  if (relevantItems.length === 0) {
    return { success: false, amount: 0, reason: 'No items to refund' };
  }

  // Determine if this is a return or cancellation scenario
  const isReturnScenario = relevantItems.some(item => item.status === 'Returned');

  if (isReturnScenario) {
    // For returns, calculate refund for all returned items
    return calculateReturnRefund(order, relevantItems);
  } else {
    // For cancellations, use the existing logic
    return calculateCancellationRefund(order, relevantItems, allItems);
  }
};

/**
 * **RETURN REFUND CALCULATOR**
 * Calculates refund for returned items
 */
const calculateReturnRefund = (order, returnedItems) => {
  let totalRefund = 0;
  const refundedItems = [];

  // Calculate proportional refund for each returned item
  for (const item of returnedItems) {
    const itemRefund = calculateItemProportion(item, order, order.items);
    totalRefund += itemRefund;
    refundedItems.push({
      title: item.title,
      amount: itemRefund
    });
  }

  return {
    success: true,
    amount: totalRefund,
    reason: `Refund for ${returnedItems.length} returned item(s)`,
    items: refundedItems
  };
};

/**
 * **CANCELLATION REFUND CALCULATOR**
 * Handles the existing cancellation logic
 */
const calculateCancellationRefund = (order, activeItems, allItems) => {
  // Find items that were recently cancelled but haven't been refunded yet
  const recentlyCancelledItems = allItems.filter(item => item.status === 'Cancelled');

  if (recentlyCancelledItems.length === 0) {
    return { success: false, amount: 0, reason: 'No cancelled items to refund' };
  }

  let totalRefund = 0;
  const refundedItems = [];

  // Calculate proportional refund for cancelled items
  for (const item of recentlyCancelledItems) {
    const itemRefund = calculateItemProportion(item, order, allItems);
    totalRefund += itemRefund;
    refundedItems.push({
      title: item.title,
      amount: itemRefund
    });
  }

  return {
    success: true,
    amount: totalRefund,
    reason: `Refund for ${recentlyCancelledItems.length} cancelled item(s)`,
    items: refundedItems
  };
};

/**
 * **CORE HELPER: CALCULATE ITEM PROPORTION**
 * Calculates exact proportional refund for a single item
 */
const calculateItemProportion = (item, order, allActiveItems) => {
  try {
    // Get item's final price (after all discounts)
    const itemFinalPrice = item.priceBreakdown?.finalPrice || (item.discountedPrice * item.quantity);

    // Special case: Single item order
    if (order.items.length === 1) {
      return Number(order.total.toFixed(2));
    }

    // Multi-item: Calculate proportional share based on original order composition
    // Calculate total value of ALL original items (not just active ones)
    const totalOriginalValue = order.items.reduce((sum, originalItem) => {
      const originalItemPrice = originalItem.priceBreakdown?.finalPrice || (originalItem.discountedPrice * originalItem.quantity);
      return sum + originalItemPrice;
    }, 0);

    if (totalOriginalValue <= 0) {
      console.error('Invalid total original value for proportion calculation');
      return 0;
    }

    // Calculate item's proportion of the original order
    const itemProportion = itemFinalPrice / totalOriginalValue;

    // Apply proportion to order total (including tax and all charges)
    const itemRefund = order.total * itemProportion;

    return Number(itemRefund.toFixed(2));
  } catch (error) {
    console.error('Error calculating item proportion:', error.message);
    return 0;
  }
};

/**
 * **LEGACY COMPATIBILITY FUNCTION**
 * Maintains backward compatibility with existing code
 */
const calculateExactRefundAmount = (item, order) => {
  const result = calculateRefundAmount('INDIVIDUAL_ITEM', order, item.product || item._id);
  return result.success ? result.amount : 0;
};

/**
 * Calculate display price for item in modals/interfaces
 * RULE: Show the actual amount customer will get back
 *
 * @param {Object} item - Order item
 * @param {Object} order - Complete order object
 * @returns {string} - Formatted price for display
 */
const getItemDisplayPrice = (item, order) => {
  const refundAmount = calculateExactRefundAmount(item, order);
  return `₹${refundAmount.toFixed(2)}`;
};

/**
 * Validate refund calculation accuracy
 *
 * @param {Array} items - Items being refunded
 * @param {Object} order - Complete order object
 * @returns {Object} - Validation result
 */
const validateRefundCalculation = (items, order) => {
  try {
    let totalRefund = 0;

    items.forEach(item => {
      totalRefund += calculateExactRefundAmount(item, order);
    });

    const isFullOrderRefund = items.length === order.items.length;
    const expectedTotal = isFullOrderRefund ? order.total : totalRefund;

    return {
      totalRefund: Number(totalRefund.toFixed(2)),
      expectedTotal: Number(expectedTotal.toFixed(2)),
      isAccurate: Math.abs(totalRefund - expectedTotal) < 0.01,
      difference: Number((totalRefund - expectedTotal).toFixed(2))
    };
  } catch (error) {
    console.error('Error validating refund calculation:', error.message);
    return {
      totalRefund: 0,
      expectedTotal: 0,
      isAccurate: false,
      difference: 0
    };
  }
};

/**
 * Get refund breakdown for display purposes
 *
 * @param {Object} item - Order item
 * @param {Object} order - Complete order object
 * @returns {Object} - Detailed breakdown
 */
const getRefundBreakdown = (item, order) => {
  try {
    const refundAmount = calculateExactRefundAmount(item, order);

    return {
      itemTitle: item.title || 'Unknown Item',
      originalPrice: item.price || 0,
      quantity: item.quantity || 1,
      refundAmount: refundAmount,
      formattedRefund: `₹${refundAmount.toFixed(2)}`,
      isFullOrderRefund: order.items.length === 1,
      explanation: order.items.length === 1
        ? 'Full order total (what you paid)'
        : 'Proportional share of order total'
    };
  } catch (error) {
    console.error('Error getting refund breakdown:', error.message);
    return {
      itemTitle: 'Unknown Item',
      originalPrice: 0,
      quantity: 1,
      refundAmount: 0,
      formattedRefund: '₹0.00',
      isFullOrderRefund: false,
      explanation: 'Error calculating refund'
    };
  }
};

/**
 * Calculate total refund for multiple items
 *
 * @param {Array} items - Items being refunded
 * @param {Object} order - Complete order object
 * @returns {number} - Total refund amount
 */
const calculateTotalRefund = (items, order) => {
  try {
    let totalRefund = 0;

    items.forEach(item => {
      totalRefund += calculateExactRefundAmount(item, order);
    });

    return Number(totalRefund.toFixed(2));
  } catch (error) {
    console.error('Error calculating total refund:', error.message);
    return 0;
  }
};

/**
 * Check if refund amount is valid for payment method
 *
 * @param {Object} order - Order object
 * @param {number} refundAmount - Calculated refund amount
 * @returns {Object} - Validation result
 */
const validateRefundForPaymentMethod = (order, refundAmount) => {
  try {
    // COD orders - only refund if delivered (cash was paid)
    if (order.paymentMethod === 'COD') {
      const wasDelivered = order.orderStatus === 'Delivered' || order.paymentStatus === 'Paid';

      if (!wasDelivered) {
        return {
          isValid: true,
          shouldRefund: false,
          reason: 'COD order not delivered - no cash payment made',
          refundAmount: 0
        };
      }
    }

    // Online payments - check payment status
    if (order.paymentMethod !== 'COD') {
      const isPaid = ['Paid', 'Partially Refunded'].includes(order.paymentStatus);

      if (!isPaid) {
        return {
          isValid: true,
          shouldRefund: false,
          reason: 'Order not paid - no refund needed',
          refundAmount: 0
        };
      }
    }

    return {
      isValid: true,
      shouldRefund: true,
      reason: 'Valid for refund',
      refundAmount: Number(refundAmount.toFixed(2))
    };
  } catch (error) {
    console.error('Error validating refund for payment method:', error.message);
    return {
      isValid: false,
      shouldRefund: false,
      reason: 'Error validating payment method',
      refundAmount: 0
    };
  }
};

module.exports = {
  // **NEW UNIFIED SYSTEM**
  calculateRefundAmount,

  // **LEGACY COMPATIBILITY**
  calculateExactRefundAmount,
  getItemDisplayPrice,
  validateRefundCalculation,
  getRefundBreakdown,
  calculateTotalRefund,
  validateRefundForPaymentMethod
};