const calculateRefundAmount = (refundType, order, targetItemId = null) => {
  try {
    if (!order || !order.total || order.total <= 0) {
      return { success: false, amount: 0, reason: 'Invalid order data' };
    }
    
    let relevantItems;
    if (refundType === 'REMAINING_ORDER') {
      const returnedItems = order.items.filter(item => item.status === 'Returned');
      const cancelledItems = order.items.filter(item => item.status === 'Cancelled');
      const activeItems = order.items.filter(item =>
        item.status === 'Active' || item.status === 'Placed' || !item.status
      );
      
      if (returnedItems.length > 0) {
        relevantItems = returnedItems;
      } else if (cancelledItems.length > 0) {
        relevantItems = cancelledItems;
      } else {
        relevantItems = activeItems;
      }
    } else {
      relevantItems = order.items.filter(item =>
        item.status === 'Active' || item.status === 'Placed' || item.status === 'Cancelled' || !item.status
      );
    }
    
    if (refundType === 'INDIVIDUAL_ITEM') {
      return calculateIndividualItemRefund(targetItemId, order, order.items);
    } else if (refundType === 'REMAINING_ORDER') {
      return calculateRemainingOrderRefund(order, relevantItems, order.items);
    } else {
      return { success: false, amount: 0, reason: 'Invalid refund type' };
    }
  } catch (error) {
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
    reason: `Refund for cancelled item: ${itemToRefund.model || itemToRefund.title || 'Unknown Product'}`,
    itemTitle: itemToRefund.model || itemToRefund.title || 'Unknown Product',
    itemId: itemToRefund._id || itemToRefund.product
  };
};
const calculateRemainingOrderRefund = (order, relevantItems, allItems) => {
  if (relevantItems.length === 0) {
    return { success: false, amount: 0, reason: 'No items to refund' };
  }
  const isReturnScenario = relevantItems.some(item => item.status === 'Returned');
  if (isReturnScenario) {
    return calculateReturnRefund(order, relevantItems);
  } else {
    return calculateCancellationRefund(order, relevantItems, allItems);
  }
};
const calculateReturnRefund = (order, returnedItems) => {
  let totalRefund = 0;
  const refundedItems = [];
  for (const item of returnedItems) {
    const itemRefund = calculateItemProportion(item, order, order.items);
    totalRefund += itemRefund;
    refundedItems.push({
      title: item.model || item.title || 'Unknown Product',
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
const calculateCancellationRefund = (order, relevantItems, allItems) => {
  if (relevantItems.length === 0) {
    return { success: false, amount: 0, reason: 'No items to refund' };
  }
  
  let totalRefund = 0;
  const refundedItems = [];
  
  for (const item of relevantItems) {
    const itemRefund = calculateItemProportion(item, order, allItems);
    totalRefund += itemRefund;
    refundedItems.push({
      title: item.model || item.title || 'Unknown Product',
      amount: itemRefund
    });
  }
  
  const itemType = relevantItems[0].status === 'Cancelled' ? 'cancelled' : 'active';
  
  return {
    success: true,
    amount: totalRefund,
    reason: `Refund for ${relevantItems.length} ${itemType} item(s)`,
    items: refundedItems
  };
};
const calculateItemProportion = (item, order, allActiveItems) => {
  try {
    const itemFinalPrice = item.priceBreakdown?.finalPrice || (item.discountedPrice * item.quantity);
    if (order.items.length === 1) {
      return Number(order.total.toFixed(2));
    }
    const totalOriginalValue = order.items.reduce((sum, originalItem) => {
      const originalItemPrice = originalItem.priceBreakdown?.finalPrice || (originalItem.discountedPrice * originalItem.quantity);
      return sum + originalItemPrice;
    }, 0);
    if (totalOriginalValue <= 0) {
      return 0;
    }
    const itemProportion = itemFinalPrice / totalOriginalValue;
    const itemRefund = order.total * itemProportion;
    return Number(itemRefund.toFixed(2));
  } catch (error) {
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
      itemTitle: item.model || item.title || 'Unknown Item',
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
    return 0;
  }
};
const validateRefundForPaymentMethod = (order, refundAmount) => {
  try {
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
    
    if (order.paymentMethod !== 'COD') {
      const paidStatuses = [
        'Paid', 
        'Partially Refunded', 
        'Refund Initiated', 
        'Refund Processing',
        'Pending Payment'
      ];
      
      const isPaid = paidStatuses.includes(order.paymentStatus);
      
      const isOnlinePaymentMade = order.paymentMethod !== 'COD' && 
                                  (order.razorpayPaymentId || order.razorpayOrderId) &&
                                  order.paymentStatus !== 'Failed';
      
      if (!isPaid && !isOnlinePaymentMade) {
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
    return {
      isValid: false,
      shouldRefund: false,
      reason: 'Error validating payment method',
      refundAmount: 0
    };
  }
};
module.exports = {
  calculateRefundAmount,
  calculateExactRefundAmount,
  getItemDisplayPrice,
  validateRefundCalculation,
  getRefundBreakdown,
  calculateTotalRefund,
  validateRefundForPaymentMethod
};