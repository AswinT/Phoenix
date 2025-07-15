// Refund Calculator
const calculateRefundAmount = (refundType, order, targetItemId = null) => {
  try {

    if (!order || !order.total || order.total <= 0) {
      console.error('Invalid order data for refund calculation');
      return { success: false, amount: 0, reason: 'Invalid order data' };
    }


    const itemsToProcess = order.items.filter(item => {
      if (refundType === 'INDIVIDUAL_ITEM') {

        return true;
      } else {

        return item.status === 'Active' || item.status === 'Placed' ||
               item.status === 'Returned' || !item.status;
      }
    });




    if (refundType === 'INDIVIDUAL_ITEM') {

      return calculateIndividualItemRefund(targetItemId, order, order.items);
    } else if (refundType === 'REMAINING_ORDER') {

      return calculateRemainingOrderRefund(order, itemsToProcess, order.items);
    } else {
      return { success: false, amount: 0, reason: 'Invalid refund type' };
    }

  } catch (error) {
    console.error('Error in refund calculation:', error.message);
    return { success: false, amount: 0, reason: 'Calculation error' };
  }
};


const calculateIndividualItemRefund = (targetItemId, order, allItems) => {

  const itemToRefund = allItems.find(item => {
    const productMatch = item.product?.toString() === targetItemId?.toString();
    const idMatch = item._id?.toString() === targetItemId?.toString();
    return productMatch || idMatch;
  });

  if (!itemToRefund) {
    return { success: false, amount: 0, reason: 'Item not found in order' };
  }


  const eligibleStatuses = ['Cancelled', 'Active', 'Return Requested', 'Returned'];
  if (!eligibleStatuses.includes(itemToRefund.status)) {
    return { success: false, amount: 0, reason: 'Item not eligible for refund' };
  }


  const refundAmount = calculateItemProportion(itemToRefund, order, allItems);

  return {
    success: true,
    amount: refundAmount,
    reason: `Refund for cancelled item: ${itemToRefund.title}`,
    itemTitle: itemToRefund.title,
    itemId: itemToRefund._id || itemToRefund.product
  };
};


const calculateRemainingOrderRefund = (order, itemsToProcess, allItems) => {

  const returnedItems = allItems.filter(item => item.status === 'Returned');
  const activeItems = allItems.filter(item =>
    item.status === 'Active' || item.status === 'Placed' || !item.status
  );


  if (returnedItems.length > 0) {
    let totalRefund = 0;
    const refundedItems = [];

    returnedItems.forEach(item => {
      const itemRefund = calculateItemProportion(item, order, allItems);
      totalRefund += itemRefund;
      refundedItems.push({
        title: item.title,
        amount: itemRefund
      });
    });

    return {
      success: true,
      amount: totalRefund,
      reason: `Refund for ${returnedItems.length} returned item(s)`,
      itemCount: returnedItems.length,
      refundedItems: refundedItems
    };
  }


  if (activeItems.length === 0) {

    const recentlyCancelledItems = allItems.filter(item => item.status === 'Cancelled');

    if (recentlyCancelledItems.length === 0) {
      return { success: false, amount: 0, reason: 'No items to refund' };
    }


    let totalRefund = 0;
    const refundedItems = [];


    const totalOrderRefund = order.total;


    let alreadyRefunded = 0;


    const remainingItems = recentlyCancelledItems.filter(item => {
      return true;
    });

    if (remainingItems.length > 0) {

      remainingItems.forEach(item => {
        const itemRefund = calculateItemProportion(item, order, allItems);
        totalRefund += itemRefund;
        refundedItems.push({
          title: item.title,
          amount: itemRefund
        });
      });



      return {
        success: true,
        amount: totalRefund,
        reason: `Refund for remaining ${remainingItems.length} item(s) in cancelled order`,
        itemCount: remainingItems.length,
        refundedItems: refundedItems
      };
    }

    return { success: false, amount: 0, reason: 'All items already processed' };
  }


  let totalRefund = 0;
  const refundedItems = [];

  activeItems.forEach(item => {
    const itemRefund = calculateItemProportion(item, order, allItems);
    totalRefund += itemRefund;
    refundedItems.push({
      title: item.title,
      amount: itemRefund
    });
  });



  return {
    success: true,
    amount: totalRefund,
    reason: `Refund for remaining ${activeItems.length} item(s) in order`,
    itemCount: activeItems.length,
    refundedItems: refundedItems
  };
};


const calculateItemProportion = (item, order, allActiveItems) => {
  try {
    // Validate inputs
    if (!item || !order || !order.total || order.total <= 0) {
      console.error('Invalid item or order data for proportion calculation');
      return 0;
    }

    // Get the item's final price (including any discounts)
    const itemFinalPrice = item.priceBreakdown?.finalPrice || (item.discountedPrice * item.quantity);

    // For single-item orders, return the full order total
    if (order.items.length === 1) {
      return Number(order.total.toFixed(2));
    }

    // Calculate the total original value of ALL items in the order
    // This ensures that the sum of all proportional refunds equals the order total
    const totalOriginalValue = order.items.reduce((sum, originalItem) => {
      const originalItemPrice = originalItem.priceBreakdown?.finalPrice || (originalItem.discountedPrice * originalItem.quantity);
      return sum + originalItemPrice;
    }, 0);

    if (totalOriginalValue <= 0) {
      console.error('Invalid total original value for proportion calculation');
      return 0;
    }

    // Calculate the item's proportion of the total order value
    const itemProportion = itemFinalPrice / totalOriginalValue;

    // Calculate the proportional refund amount
    // This includes the item's share of taxes, shipping, and any order-level discounts
    const itemRefund = order.total * itemProportion;

    // Validate the result
    if (itemRefund < 0 || itemRefund > order.total) {
      console.error(`Invalid refund amount calculated: ₹${itemRefund} for item ${item.title}`);
      return 0;
    }

    return Number(itemRefund.toFixed(2));
  } catch (error) {
    console.error('Error calculating item proportion:', error.message);
    return 0;
  }
};


const calculateExactRefundAmount = (item, order) => {
  const result = calculateRefundAmount('INDIVIDUAL_ITEM', order, item.product || item._id);
  return result.success ? result.amount : 0;
};


const getItemDisplayPrice = (item, order) => {
  const refundAmount = calculateExactRefundAmount(item, order);
  return `₹${refundAmount.toFixed(2)}`;
};


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
 * Calculate the remaining order amount after partial cancellations
 * This function ensures consistency between refunded amounts and remaining amounts
 * @param {Object} order - The order object
 * @returns {number} - The remaining amount the customer should pay for active items
 */
const calculateRemainingOrderAmount = (order) => {
  try {
    // Validate input
    if (!order || !order.items || !Array.isArray(order.items) || !order.total || order.total <= 0) {
      console.error('Invalid order data for remaining amount calculation');
      return 0;
    }

    // Get active items (items that are not cancelled or returned)
    const activeItems = order.items.filter(item =>
      item.status === 'Active' ||
      item.status === 'Placed' ||
      !item.status
    );

    // If no active items, remaining amount is 0
    if (activeItems.length === 0) {
      return 0;
    }

    // If all items are still active, return full order total
    if (activeItems.length === order.items.length) {
      return Number(order.total.toFixed(2));
    }

    // Calculate the remaining amount using the same proportional logic as refunds
    // This ensures mathematical consistency: refunded + remaining = order total
    let remainingAmount = 0;

    activeItems.forEach(item => {
      remainingAmount += calculateItemProportion(item, order, order.items);
    });

    // Validate the result
    if (remainingAmount < 0 || remainingAmount > order.total) {
      console.error(`Invalid remaining amount calculated: ₹${remainingAmount} for order ${order._id}`);
      return 0;
    }

    return Number(remainingAmount.toFixed(2));
  } catch (error) {
    console.error('Error calculating remaining order amount:', error.message);
    return 0;
  }
};

/**
 * Validate that refunded amounts + remaining amount = order total
 * This function helps ensure mathematical consistency in partial cancellations
 * @param {Object} order - The order object
 * @returns {Object} - Validation result with details
 */
const validateOrderAmountConsistency = (order) => {
  try {
    if (!order || !order.items || !order.total) {
      return {
        isValid: false,
        reason: 'Invalid order data',
        details: {}
      };
    }

    const activeItems = order.items.filter(item =>
      item.status === 'Active' || item.status === 'Placed' || !item.status
    );
    const cancelledItems = order.items.filter(item =>
      item.status === 'Cancelled'
    );
    const returnedItems = order.items.filter(item =>
      item.status === 'Returned'
    );

    // Calculate amounts
    const remainingAmount = calculateRemainingOrderAmount(order);
    const cancelledRefunds = calculateTotalRefund(cancelledItems, order);
    const returnedRefunds = calculateTotalRefund(returnedItems, order);
    const totalRefunds = cancelledRefunds + returnedRefunds;
    const calculatedTotal = remainingAmount + totalRefunds;

    // Check for consistency (allow small rounding differences)
    const difference = Math.abs(calculatedTotal - order.total);
    const isValid = difference < 0.01;

    return {
      isValid,
      reason: isValid ? 'Amounts are consistent' : 'Amount mismatch detected',
      details: {
        orderTotal: Number(order.total.toFixed(2)),
        remainingAmount: remainingAmount,
        cancelledRefunds: cancelledRefunds,
        returnedRefunds: returnedRefunds,
        totalRefunds: totalRefunds,
        calculatedTotal: Number(calculatedTotal.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        activeItemsCount: activeItems.length,
        cancelledItemsCount: cancelledItems.length,
        returnedItemsCount: returnedItems.length
      }
    };
  } catch (error) {
    console.error('Error validating order amount consistency:', error.message);
    return {
      isValid: false,
      reason: 'Validation error',
      details: {}
    };
  }
};


const validateRefundForPaymentMethod = (order, refundAmount) => {
  try {

    if (order.paymentMethod === 'COD' || order.paymentMethod === 'cod') {
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


    if (order.paymentMethod !== 'COD' && order.paymentMethod !== 'cod') {
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
    console.error('❌ Error validating refund for payment method:', error.message);
    return {
      isValid: false,
      shouldRefund: false,
      reason: 'Error validating payment method',
      refundAmount: 0
    };
  }
};

module.exports = {
  // Core refund calculation functions
  calculateRefundAmount,
  calculateExactRefundAmount,

  // Display and formatting functions
  getItemDisplayPrice,
  getRefundBreakdown,

  // Validation functions
  validateRefundCalculation,
  validateRefundForPaymentMethod,
  validateOrderAmountConsistency,

  // Total calculation functions
  calculateTotalRefund,
  calculateRemainingOrderAmount
};
