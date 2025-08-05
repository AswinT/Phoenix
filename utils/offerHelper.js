const Offer = require("../models/offerSchema")
const Product = require("../models/productSchema")

const createSpecialOffer = (regularPrice, salePrice) => {
  if (!regularPrice || !salePrice || salePrice >= regularPrice) {
    return null;
  }

  const discountAmount = regularPrice - salePrice;
  const discountPercentage = (discountAmount / regularPrice) * 100;

  return {
    _id: 'special-offer',
    title: 'Special Offer',
    description: 'Automatic discount based on sale price',
    discountType: 'fixed',
    discountValue: discountAmount,
    isActive: true,
    isSpecialOffer: true, // Flag to identify this as an auto-generated special offer
    appliesTo: 'specific_products',
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  };
};

const getActiveOfferForProduct = async (productId, productCategoryId, productPrice) => {
  try {
    const now = new Date()
    let categoryToQuery = productCategoryId
    let productDoc = null

    if (!categoryToQuery && productId) {
      productDoc = await Product.findById(productId).select("category regularPrice salePrice").lean()
      if (productDoc && productDoc.category) {
        categoryToQuery = productDoc.category.toString()
      }
    } else if (productId && !productDoc) {
      productDoc = await Product.findById(productId).select("regularPrice salePrice").lean()
    }
    const offerQueryConditions = []
    offerQueryConditions.push({ appliesTo: "all_products" })
    if (productId) {
      offerQueryConditions.push({
        appliesTo: "specific_products",
        applicableProducts: { $in: [productId] },
      })
    }
    offerQueryConditions.push({ appliesTo: "all_categories" })
    if (categoryToQuery) {
      offerQueryConditions.push({
        appliesTo: "specific_categories",
        applicableCategories: { $in: [categoryToQuery] },
      })
    }
    const potentialOffers = await Offer.find({
      $or: offerQueryConditions,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean()

    let specialOffer = null
    if (productDoc && productDoc.regularPrice && productDoc.salePrice) {
      specialOffer = createSpecialOffer(productDoc.regularPrice, productDoc.salePrice)
    }

    const allOffers = [...(potentialOffers || [])]
    if (specialOffer) {
      allOffers.push(specialOffer)
    }

    if (!allOffers || allOffers.length === 0) {
      return null
    }

    let bestOffer = null
    let bestDiscountAmount = 0
    const basePrice = productPrice || (productDoc ? productDoc.regularPrice : 0)

    for (const offer of allOffers) {
      const discountInfo = calculateDiscount(offer, basePrice)
      if (discountInfo.discountAmount > bestDiscountAmount) {
        bestOffer = offer
        bestDiscountAmount = discountInfo.discountAmount
      } else if (discountInfo.discountAmount === bestDiscountAmount && bestOffer) {
        if (offer.isSpecialOffer && !bestOffer.isSpecialOffer) {
          bestOffer = offer
        } else if (!offer.isSpecialOffer && bestOffer.isSpecialOffer) {
          continue
        } else {
          if (!offer.isSpecialOffer && !bestOffer.isSpecialOffer) {
            const currentPriority = getOfferPriority(bestOffer)
            const newPriority = getOfferPriority(offer)
            if (newPriority < currentPriority) {
              bestOffer = offer
            }
          }
        }
      }
    }
    return bestOffer
  } catch (error) {
    console.error("Error fetching active offer:", error)
    return null
  }
}
const getOfferPriority = (offer) => {
  switch (offer.appliesTo) {
    case "specific_products":
      return 1
    case "specific_categories":
      return 2
    case "all_products":
      return 3
    case "all_categories":
      return 4
    default:
      return 5
  }
}
const calculateDiscount = (offer, price) => {
  if (!offer || typeof price !== "number" || price <= 0) {
    return { discountAmount: 0, discountPercentage: 0, finalPrice: price || 0 }
  }
  let discountAmount = 0
  let discountPercentage = 0
  if (offer.discountType === "percentage") {
    discountPercentage = Math.min(offer.discountValue, 100)
    discountAmount = (price * discountPercentage) / 100
  } else if (offer.discountType === "fixed") {
    discountAmount = offer.discountValue
    discountPercentage = price > 0 ? (discountAmount / price) * 100 : 0
  }
  discountAmount = Math.min(discountAmount, price)
  discountPercentage = Math.min(discountPercentage, 100)
  const finalPrice = Math.max(0, price - discountAmount)
  return {
    discountAmount: Number.parseFloat(discountAmount.toFixed(2)),
    discountPercentage: Number.parseFloat(discountPercentage.toFixed(2)),
    finalPrice: Number.parseFloat(finalPrice.toFixed(2)),
    offer: offer,
  }
}
const getActiveOffersForProducts = async (products) => {
  try {
    const offerMap = {}
    for (const product of products) {
      const offer = await getActiveOfferForProduct(
        product._id.toString(),
        product.category ? product.category.toString() : null,
        product.price,
      )
      if (offer) {
        offerMap[product._id.toString()] = calculateDiscount(offer, product.price)
      }
    }
    return offerMap
  } catch (error) {
    console.error("Error fetching offers for products:", error)
    return {}
  }
}
const isOfferActive = (offer) => {
  if (!offer || !offer.isActive) return false
  const now = new Date()
  const startDate = new Date(offer.startDate)
  const endDate = new Date(offer.endDate)
  return startDate <= now && endDate >= now
}
const getOfferStatus = (offer) => {
  if (!offer) return "No Offer"
  const now = new Date()
  const startDate = new Date(offer.startDate)
  const endDate = new Date(offer.endDate)
  if (!offer.isActive) return "Inactive"
  if (endDate < now) return "Expired"
  if (startDate > now) return "Upcoming"
  return "Active"
}
const calculateProportionalCouponDiscount = (coupon, items) => {
  if (!coupon || !items || items.length === 0) {
    return { totalDiscount: 0, itemDiscounts: {} }
  }
  const cartTotal = items.reduce((sum, item) => {
    if (!item || typeof item.discountedPrice !== 'number' || typeof item.quantity !== 'number') {
      console.warn('Invalid item in discount calculation:', item);
      return sum;
    }
    const itemTotal = item.discountedPrice * item.quantity;
    return sum + itemTotal;
  }, 0);
  if (cartTotal <= 0) {
    return { totalDiscount: 0, itemDiscounts: {} }
  }
  let totalCouponDiscount = 0;
  if (coupon.discountType === "percentage") {
    totalCouponDiscount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountValue) {
      totalCouponDiscount = Math.min(totalCouponDiscount, coupon.maxDiscountValue);
    }
  } else {
    totalCouponDiscount = Math.min(coupon.discountValue, cartTotal);
  }
  totalCouponDiscount = parseFloat(totalCouponDiscount.toFixed(2));
  const itemDiscounts = {};
  let allocatedDiscount = 0;
  items.forEach((item, index) => {
    if (!item || typeof item.discountedPrice !== 'number' || typeof item.quantity !== 'number') {
      return;
    }
    const itemTotal = item.discountedPrice * item.quantity;
    const proportion = itemTotal / cartTotal;
    let itemDiscount = totalCouponDiscount * proportion;
    if (index === items.length - 1) {
      itemDiscount = parseFloat((totalCouponDiscount - allocatedDiscount).toFixed(2));
    } else {
      itemDiscount = parseFloat(itemDiscount.toFixed(2));
      allocatedDiscount += itemDiscount;
    }
    const finalDiscount = Math.min(itemDiscount, itemTotal);
    const itemKey = item.product ? item.product.toString() : `item-${index}`;
    itemDiscounts[itemKey] = {
      amount: finalDiscount,
      proportion: proportion
    };
  });
  const actualTotalDiscount = parseFloat(
    Object.values(itemDiscounts)
      .reduce((sum, discount) => sum + discount.amount, 0)
      .toFixed(2)
  );
  return {
    totalDiscount: actualTotalDiscount,
    itemDiscounts
  }
}
const reapplyCouponBenefitsAfterCancellation = (order, coupon) => {
  try {
    if (!order || !order.items || !coupon) {
      console.warn('Invalid order or coupon data for reapplying benefits');
      return order;
    }
    if (!order.couponDiscount || order.couponDiscount <= 0) {
      return order;
    }
    const activeItems = order.items.filter(item => 
      item.status === 'Active' || !item.status
    );
    if (activeItems.length === 0) {
      return order;
    }
    if (activeItems.length === order.items.length) {
      return order;
    }
    const reapplyFullBenefit = activeItems.length === 1 || activeItems.length <= Math.floor(order.items.length / 2);
    if (reapplyFullBenefit) {
      const activeItemsTotal = activeItems.reduce((sum, item) => {
        if (!item || typeof item.discountedPrice !== 'number' || typeof item.quantity !== 'number') {
          return sum;
        }
        const itemTotal = item.discountedPrice * item.quantity;
        return sum + itemTotal;
      }, 0);
      if (activeItemsTotal <= 0) {
        console.warn('Active items total is zero or negative - cannot reapply coupon');
        return order;
      }
      let newCouponDiscount = 0;
      if (coupon.discountType === "percentage") {
        newCouponDiscount = (activeItemsTotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountValue) {
          newCouponDiscount = Math.min(newCouponDiscount, coupon.maxDiscountValue);
        }
      } else {
        newCouponDiscount = Math.min(coupon.discountValue, activeItemsTotal);
      }
      newCouponDiscount = parseFloat(newCouponDiscount.toFixed(2));
      const newItemDiscounts = {};
      let allocatedDiscount = 0;
      activeItems.forEach((item, index) => {
        if (!item || typeof item.discountedPrice !== 'number' || typeof item.quantity !== 'number') {
          return;
        }
        const itemTotal = item.discountedPrice * item.quantity;
        const proportion = itemTotal / activeItemsTotal;
        let itemDiscount;
        if (index === activeItems.length - 1) {
          itemDiscount = parseFloat((newCouponDiscount - allocatedDiscount).toFixed(2));
        } else {
          itemDiscount = parseFloat((newCouponDiscount * proportion).toFixed(2));
          allocatedDiscount += itemDiscount;
        }
        const finalDiscount = Math.min(itemDiscount, itemTotal);
        if (item.priceBreakdown) {
          item.priceBreakdown.couponDiscount = finalDiscount;
          item.priceBreakdown.couponProportion = proportion;
          item.priceBreakdown.finalPrice = parseFloat((item.priceBreakdown.priceAfterOffer - finalDiscount).toFixed(2));
        }
        item.couponDiscount = finalDiscount;
        item.couponProportion = proportion;
        item.finalPrice = parseFloat(((item.discountedPrice * item.quantity) - finalDiscount).toFixed(2));
        const itemKey = item.product ? item.product.toString() : `item-${index}`;
        newItemDiscounts[itemKey] = {
          amount: finalDiscount,
          proportion: proportion
        };
      });
      const actualTotalDiscount = parseFloat(
        Object.values(newItemDiscounts)
          .reduce((sum, discount) => sum + discount.amount, 0)
          .toFixed(2)
      );
      order.couponDiscount = actualTotalDiscount;
      const subtotal = activeItems.reduce((sum, item) => 
        sum + (item.discountedPrice * item.quantity), 0);
      const taxableAmount = subtotal - actualTotalDiscount;
      const tax = parseFloat((taxableAmount * 0.08).toFixed(2));
      order.tax = tax;
      order.total = parseFloat((taxableAmount + tax).toFixed(2));
    }
    return order;
  } catch (error) {
    console.error('Error reapplying coupon benefits:', error);
    return order;
  }
}
const getItemPriceDetails = (item, couponInfo = null) => {
  const originalPrice = item.price || item.priceAtAddition
  const quantity = item.quantity
  const subtotal = originalPrice * quantity
  const offerDiscount = item.offerDiscount || 0
  const priceAfterOffer = item.discountedPrice * quantity
  const couponDiscount = couponInfo ? couponInfo.amount : 0
  const finalPrice = priceAfterOffer - couponDiscount
  return {
    originalPrice,
    quantity,
    subtotal,
    offerDiscount,
    priceAfterOffer,
    couponDiscount,
    finalPrice,
    couponProportion: couponInfo ? couponInfo.proportion : 0
  }
}
const calculateFinalItemPrice = (item, order = null) => {
  try {
    const originalPrice = item.price || item.priceAtAddition;
    const quantity = item.quantity || 1;
    const subtotal = originalPrice * quantity;
    const offerDiscount = item.offerDiscount || 0;
    const priceAfterOffer = (item.discountedPrice || originalPrice) * quantity;
    let couponDiscount = 0;
    let couponProportion = 0;
    if (order && order.couponDiscount > 0 && item.priceBreakdown?.couponProportion) {
      couponProportion = item.priceBreakdown.couponProportion;
      couponDiscount = order.couponDiscount * couponProportion;
    }
    const finalPrice = priceAfterOffer - couponDiscount;
    return {
      originalPrice,
      quantity,
      subtotal,
      offerDiscount,
      priceAfterOffer,
      couponDiscount,
      couponProportion,
      finalPrice: Math.max(0, Number(finalPrice.toFixed(2)))
    };
  } catch (error) {
    return {
      originalPrice: item.price || 0,
      quantity: item.quantity || 1,
      subtotal: (item.price || 0) * (item.quantity || 1),
      offerDiscount: 0,
      priceAfterOffer: (item.price || 0) * (item.quantity || 1),
      couponDiscount: 0,
      couponProportion: 0,
      finalPrice: (item.price || 0) * (item.quantity || 1)
    };
  }
};
const getUnifiedPriceBreakdown = (item, order = null) => {
  try {
    if (!item) {
      return null;
    }
    const quantity = item.quantity || 1;
    const originalPrice = item.price || item.priceAtAddition || 0;
    const originalTotal = originalPrice * quantity;
    const discountedPrice = item.discountedPrice || originalPrice;
    const offerDiscount = originalPrice - discountedPrice;
    const offerDiscountTotal = offerDiscount * quantity;
    const priceAfterOffer = discountedPrice * quantity;
    let couponDiscount = 0;
    let couponProportion = 0;
    if (item.priceBreakdown && item.priceBreakdown.couponDiscount) {
      couponDiscount = item.priceBreakdown.couponDiscount;
      couponProportion = item.priceBreakdown.couponProportion || 0;
    } else if (item.couponDiscount) {
      couponDiscount = item.couponDiscount;
      couponProportion = item.couponProportion || 0;
    }
    const finalPrice = priceAfterOffer - couponDiscount;
    let taxAmount = 0;
    if (order && order.tax && order.total) {
      const orderSubtotal = order.total - order.tax;
      if (orderSubtotal > 0) {
        const itemProportion = finalPrice / orderSubtotal;
        taxAmount = order.tax * itemProportion;
      }
    }
    const finalTotal = finalPrice + taxAmount;
    return {
      originalPrice,
      originalTotal,
      discountedPrice,
      offerDiscount,
      offerDiscountTotal,
      priceAfterOffer,
      couponDiscount,
      couponProportion,
      finalPrice,
      taxAmount,
      finalTotal,
      quantity,
      formattedOriginalPrice: `₹${originalPrice.toFixed(2)}`,
      formattedOriginalTotal: `₹${originalTotal.toFixed(2)}`,
      formattedDiscountedPrice: `₹${discountedPrice.toFixed(2)}`,
      formattedOfferDiscount: `₹${offerDiscount.toFixed(2)}`,
      formattedPriceAfterOffer: `₹${priceAfterOffer.toFixed(2)}`,
      formattedCouponDiscount: `₹${couponDiscount.toFixed(2)}`,
      formattedFinalPrice: `₹${finalPrice.toFixed(2)}`,
      formattedTaxAmount: `₹${taxAmount.toFixed(2)}`,
      formattedFinalTotal: `₹${finalTotal.toFixed(2)}`
    };
  } catch (error) {
    console.error('Error in getUnifiedPriceBreakdown:', error);
    return {
      originalPrice: 0,
      originalTotal: 0,
      discountedPrice: 0,
      offerDiscount: 0,
      offerDiscountTotal: 0,
      priceAfterOffer: 0,
      couponDiscount: 0,
      couponProportion: 0,
      finalPrice: 0,
      taxAmount: 0,
      finalTotal: 0,
      quantity: item.quantity || 1,
      formattedOriginalPrice: '₹0.00',
      formattedOriginalTotal: '₹0.00',
      formattedDiscountedPrice: '₹0.00',
      formattedOfferDiscount: '₹0.00',
      formattedPriceAfterOffer: '₹0.00',
      formattedCouponDiscount: '₹0.00',
      formattedFinalPrice: '₹0.00',
      formattedTaxAmount: '₹0.00',
      formattedFinalTotal: '₹0.00'
    };
  }
};
module.exports = {
  getActiveOfferForProduct,
  calculateDiscount,
  getActiveOffersForProducts,
  isOfferActive,
  getOfferStatus,
  getOfferPriority,
  calculateProportionalCouponDiscount,
  getItemPriceDetails,
  calculateFinalItemPrice,
  getUnifiedPriceBreakdown,
  reapplyCouponBenefitsAfterCancellation,
  createSpecialOffer
}