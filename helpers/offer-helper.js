// Offer Helper
const calculateDiscount = (item, order = null) => {

  return 0;
};


const getUnifiedPriceBreakdown = (item, order = null) => {
  try {

    if (!item) {
      return {
        originalPrice: 0,
        discount: 0,
        finalPrice: 0,
        discountPercentage: 0
      };
    }


    let originalPrice = 0;
    

    if (item.priceAtAddition) {
      originalPrice = item.priceAtAddition;
    } else if (item.product && item.product.salePrice) {
      originalPrice = item.product.salePrice;
    } else if (item.product && item.product.price) {
      originalPrice = item.product.price;
    } else if (item.salePrice) {
      originalPrice = item.salePrice;
    } else if (item.price) {
      originalPrice = item.price;
    }


    originalPrice = Number(originalPrice) || 0;


    const discount = calculateDiscount(item, order);
    

    const finalPrice = Math.max(0, originalPrice - discount);
    

    const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

    return {
      originalPrice: originalPrice,
      discount: discount,
      finalPrice: finalPrice,
      discountPercentage: discountPercentage,

      regularPrice: originalPrice,
      salePrice: finalPrice,
      offerDiscount: discount
    };

  } catch (error) {
    console.error('Error in getUnifiedPriceBreakdown:', error);
    

    return {
      originalPrice: 0,
      discount: 0,
      finalPrice: 0,
      discountPercentage: 0,
      regularPrice: 0,
      salePrice: 0,
      offerDiscount: 0
    };
  }
};


const calculateOrderTotal = (order) => {
  try {
    if (!order || !order.items || !Array.isArray(order.items)) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        finalTotal: 0
      };
    }

    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of order.items) {
      const priceBreakdown = getUnifiedPriceBreakdown(item, order);
      const quantity = item.quantity || 1;
      
      subtotal += priceBreakdown.originalPrice * quantity;
      totalDiscount += priceBreakdown.discount * quantity;
    }

    const finalTotal = subtotal - totalDiscount;

    return {
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      finalTotal: Math.max(0, finalTotal)
    };

  } catch (error) {
    console.error('Error in calculateOrderTotal:', error);
    return {
      subtotal: 0,
      totalDiscount: 0,
      finalTotal: 0
    };
  }
};


const isEligibleForOffers = (item, order = null) => {
  return false;
};

const getAvailableOffers = (item, order = null) => {
  return [];
};

module.exports = {
  calculateDiscount,
  getUnifiedPriceBreakdown,
  calculateOrderTotal,
  isEligibleForOffers,
  getAvailableOffers
};
