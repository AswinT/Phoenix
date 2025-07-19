// utils/offer-helper.js
const Offer = require("../models/offerSchema")
const Product = require("../models/productSchema")

/**
 * Get the best active offer for a product
 * Applies the largest discount (highest monetary value)
 * @param {string} productId - The product ID
 * @param {string} productCategoryId - The category ID of the product (optional)
 * @param {number} productPrice - The product price (required for accurate comparison)
 * @returns {Promise<Object|null>} - The best offer object or null if no active offer
 */
const getActiveOfferForProduct = async (productId, productCategoryId, productPrice) => {
  try {
    const now = new Date()
    let categoryToQuery = productCategoryId

    // Get product category if not provided
    if (!categoryToQuery && productId) {
      const productDoc = await Product.findById(productId).select("category").lean()
      if (productDoc && productDoc.category) {
        categoryToQuery = productDoc.category.toString()
      }
    }

    // Build query conditions for all applicable offers
    const offerQueryConditions = []

    // Offers for "All Products"
    offerQueryConditions.push({ appliesTo: "all_products" })

    // Offers for "Specific Products"
    if (productId) {
      offerQueryConditions.push({
        appliesTo: "specific_products",
        applicableProducts: { $in: [productId] },
      })
    }

    // Offers for "All Categories"
    offerQueryConditions.push({ appliesTo: "all_categories" })

    // Offers for "Specific Categories"
    if (categoryToQuery) {
      offerQueryConditions.push({
        appliesTo: "specific_categories",
        applicableCategories: { $in: [categoryToQuery] },
      })
    }

    // Find all active offers that apply to this product
    const potentialOffers = await Offer.find({
      $or: offerQueryConditions,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean()

    if (!potentialOffers || potentialOffers.length === 0) {
      return null
    }

    // Calculate actual discount amounts for each offer and find the best one
    let bestOffer = null
    let bestDiscountAmount = 0

    for (const offer of potentialOffers) {
      const discountInfo = calculateDiscount(offer, productPrice)

      // Compare by actual discount amount (monetary value)
      if (discountInfo.discountAmount > bestDiscountAmount) {
        bestOffer = offer
        bestDiscountAmount = discountInfo.discountAmount
      } else if (discountInfo.discountAmount === bestDiscountAmount && bestOffer) {
        // If discount amounts are equal, prioritize by specificity
        const currentPriority = getOfferPriority(bestOffer)
        const newPriority = getOfferPriority(offer)

        if (newPriority < currentPriority) {
          bestOffer = offer
        }
      }
    }

    return bestOffer
  } catch (error) {
    console.error("Error fetching active offer:", error)
    return null
  }
}

/**
 * Get offer priority (lower number = higher priority)
 * @param {Object} offer - The offer object
 * @returns {number} - Priority number
 */
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

/**
 * Calculate discount amount and percentage based on offer
 * @param {Object} offer - The offer object
 * @param {number} price - The product price
 * @returns {Object} - Discount information { discountAmount, discountPercentage, finalPrice }
 */
const calculateDiscount = (offer, price) => {
  if (!offer || typeof price !== "number" || price <= 0) {
    return { discountAmount: 0, discountPercentage: 0, finalPrice: price || 0 }
  }

  let discountAmount = 0
  let discountPercentage = 0

  if (offer.discountType === "percentage") {
    discountPercentage = Math.min(offer.discountValue, 100) // Cap at 100%
    discountAmount = (price * discountPercentage) / 100
  } else if (offer.discountType === "fixed") {
    discountAmount = offer.discountValue
    discountPercentage = price > 0 ? (discountAmount / price) * 100 : 0
  }

  // Ensure discount doesn't exceed product price
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

/**
 * Get all active offers for multiple products
 * @param {Array} products - Array of product objects with _id, price, and category
 * @returns {Promise<Object>} - Object with productId as key and offer info as value
 */
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

/**
 * Check if an offer is currently active
 * @param {Object} offer - The offer object
 * @returns {boolean} - True if offer is active
 */
const isOfferActive = (offer) => {
  if (!offer || !offer.isActive) return false

  const now = new Date()
  const startDate = new Date(offer.startDate)
  const endDate = new Date(offer.endDate)

  return startDate <= now && endDate >= now
}

/**
 * Get offer status text
 * @param {Object} offer - The offer object
 * @returns {string} - Status text
 */
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

/**
 * Calculate proportional coupon discount for each item
 * @param {Object} coupon - The coupon object
 * @param {Array} items - Array of items with discountedPrice and quantity
 * @returns {Object} - Object with total discount and per-item discounts
 */
const calculateProportionalCouponDiscount = (coupon, items) => {
  if (!coupon || !items || items.length === 0) {
    return { totalDiscount: 0, itemDiscounts: {} }
  }

  // Calculate cart total from prices after offer
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

  // Calculate total coupon discount
  let totalCouponDiscount = 0;
  if (coupon.discountType === "percentage") {
    totalCouponDiscount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountValue) {
      totalCouponDiscount = Math.min(totalCouponDiscount, coupon.maxDiscountValue);
    }
  } else {
    totalCouponDiscount = Math.min(coupon.discountValue, cartTotal);
  }

  // Use precise decimal calculations - fix rounding errors
  // Round to 2 decimal places only at the end
  totalCouponDiscount = parseFloat(totalCouponDiscount.toFixed(2));
  
  const itemDiscounts = {};
  
  // Track allocated discount to handle penny rounding issues
  let allocatedDiscount = 0;

  // Split discount among items proportionally based on their price after offer
  items.forEach((item, index) => {
    if (!item || typeof item.discountedPrice !== 'number' || typeof item.quantity !== 'number') {
      return; // Skip invalid items
    }
    
    const itemTotal = item.discountedPrice * item.quantity;
    const proportion = itemTotal / cartTotal;
    
    // Calculate item's share of the discount - keep full precision during calculation
    let itemDiscount = totalCouponDiscount * proportion;
    
    // For the last item, use the remaining discount to ensure total adds up exactly
    if (index === items.length - 1) {
      itemDiscount = parseFloat((totalCouponDiscount - allocatedDiscount).toFixed(2));
    } else {
      // Round to 2 decimal places for display
      itemDiscount = parseFloat(itemDiscount.toFixed(2));
      allocatedDiscount += itemDiscount;
    }
    
    // Ensure discount doesn't exceed item's price after offer
    const finalDiscount = Math.min(itemDiscount, itemTotal);

    // Use product ID as string key if available, otherwise use index
    const itemKey = item.product ? item.product.toString() : `item-${index}`;
    itemDiscounts[itemKey] = {
      amount: finalDiscount,
      proportion: proportion
    };
  });

  // Recalculate total discount based on individual item discounts to ensure consistency
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

/**
 * NEW FUNCTION: Reapply coupon benefits for remaining items after some items are canceled
 * When only one or few active items remain, give them full benefit of the coupon
 * @param {Object} order - The complete order object
 * @param {Object} coupon - The coupon object
 * @returns {Object} - Updated order with recalculated coupon discounts
 */
const reapplyCouponBenefitsAfterCancellation = (order, coupon) => {
  try {
    if (!order || !order.items || !coupon) {
      console.warn('Invalid order or coupon data for reapplying benefits');
      return order;
    }

    if (!order.couponDiscount || order.couponDiscount <= 0) {
      console.log('No coupon discount to reapply');
      return order;
    }

    // Get active (non-cancelled) items
    const activeItems = order.items.filter(item => 
      item.status === 'Active' || !item.status
    );

    // Only reapply if there are active items and some were cancelled
    if (activeItems.length === 0) {
      console.log('No active items remaining - nothing to reapply');
      return order;
    }

    if (activeItems.length === order.items.length) {
      console.log('All items still active - no need to reapply');
      return order;
    }

    // If there is only one active item left, or there are very few active items (less than half), 
    // apply the full coupon benefit to the remaining items
    const reapplyFullBenefit = activeItems.length === 1 || activeItems.length <= Math.floor(order.items.length / 2);

    if (reapplyFullBenefit) {
      console.log(`Reapplying coupon benefits to ${activeItems.length} remaining items`);
      
      // Calculate the cart total for active items
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

      // Calculate new coupon discount with precise decimal handling
      let newCouponDiscount = 0;
      if (coupon.discountType === "percentage") {
        newCouponDiscount = (activeItemsTotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountValue) {
          newCouponDiscount = Math.min(newCouponDiscount, coupon.maxDiscountValue);
        }
      } else {
        newCouponDiscount = Math.min(coupon.discountValue, activeItemsTotal);
      }
      
      // Round to 2 decimal places
      newCouponDiscount = parseFloat(newCouponDiscount.toFixed(2));

      // Calculate new proportions for active items
      const newItemDiscounts = {};
      let allocatedDiscount = 0;
      
      activeItems.forEach((item, index) => {
        if (!item || typeof item.discountedPrice !== 'number' || typeof item.quantity !== 'number') {
          return;
        }
        
        const itemTotal = item.discountedPrice * item.quantity;
        const proportion = itemTotal / activeItemsTotal;
        
        // Calculate discount with proper rounding
        let itemDiscount;
        if (index === activeItems.length - 1) {
          // Last item gets remaining discount to ensure exact total
          itemDiscount = parseFloat((newCouponDiscount - allocatedDiscount).toFixed(2));
        } else {
          itemDiscount = parseFloat((newCouponDiscount * proportion).toFixed(2));
          allocatedDiscount += itemDiscount;
        }
        
        // Ensure discount doesn't exceed item total
        const finalDiscount = Math.min(itemDiscount, itemTotal);

        // Update the item's price breakdown with new coupon values
        if (item.priceBreakdown) {
          item.priceBreakdown.couponDiscount = finalDiscount;
          item.priceBreakdown.couponProportion = proportion;
          // Calculate final price after offer and coupon
          item.priceBreakdown.finalPrice = parseFloat((item.priceBreakdown.priceAfterOffer - finalDiscount).toFixed(2));
        }
        
        // Also update the direct properties in case they're used
        item.couponDiscount = finalDiscount;
        item.couponProportion = proportion;
        item.finalPrice = parseFloat(((item.discountedPrice * item.quantity) - finalDiscount).toFixed(2));

        // Store for calculating total
        const itemKey = item.product ? item.product.toString() : `item-${index}`;
        newItemDiscounts[itemKey] = {
          amount: finalDiscount,
          proportion: proportion
        };
      });

      // Update the order's coupon discount - recalculate from items for consistency
      const actualTotalDiscount = parseFloat(
        Object.values(newItemDiscounts)
          .reduce((sum, discount) => sum + discount.amount, 0)
          .toFixed(2)
      );
      
      order.couponDiscount = actualTotalDiscount;
      
      // Recalculate order total and apply tax
      const subtotal = activeItems.reduce((sum, item) => 
        sum + (item.discountedPrice * item.quantity), 0);
      
      // Calculate tax on subtotal after coupon discount
      const taxableAmount = subtotal - actualTotalDiscount;
      // Assuming 8% tax rate (update this according to your actual tax rate)
      const tax = parseFloat((taxableAmount * 0.08).toFixed(2));
      
      // Update order tax
      order.tax = tax;
      
      // Calculate final order total
      order.total = parseFloat((taxableAmount + tax).toFixed(2));
      
      console.log(`Coupon benefits reapplied: Original discount=${coupon.discountValue}, New total discount=${actualTotalDiscount}`);
    }

    return order;
  } catch (error) {
    console.error('Error reapplying coupon benefits:', error);
    // Return original order on error to prevent data corruption
    return order;
  }
}

/**
 * Get detailed price breakdown for an item including proportional coupon discount
 * @param {Object} item - Cart/Order item
 * @param {Object} couponInfo - Coupon discount info for this item
 * @returns {Object} - Detailed price breakdown
 */
const getItemPriceDetails = (item, couponInfo = null) => {
  const originalPrice = item.price || item.priceAtAddition
  const quantity = item.quantity
  const subtotal = originalPrice * quantity
  
  // Get offer discount
  const offerDiscount = item.offerDiscount || 0
  const priceAfterOffer = item.discountedPrice * quantity

  // Get coupon discount
  const couponDiscount = couponInfo ? couponInfo.amount : 0
  
  // Calculate final price
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

/**
 * Calculate final price for an item considering all discounts
 * @param {Object} item - The item object with price, quantity, and discounts
 * @param {Object} order - The order object containing coupon information
 * @returns {Object} - Object containing all price calculations
 */
const calculateFinalItemPrice = (item, order = null) => {
  try {
    // Start with base price
    const originalPrice = item.price || item.priceAtAddition;
    const quantity = item.quantity || 1;
    const subtotal = originalPrice * quantity;
    
    // Get offer discount
    const offerDiscount = item.offerDiscount || 0;
    const priceAfterOffer = (item.discountedPrice || originalPrice) * quantity;
    
    // Calculate coupon discount if applicable
    let couponDiscount = 0;
    let couponProportion = 0;
    
    if (order && order.couponDiscount > 0 && item.priceBreakdown?.couponProportion) {
      couponProportion = item.priceBreakdown.couponProportion;
      couponDiscount = order.couponDiscount * couponProportion;
    }
    
    // Calculate final price
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
    console.error('Error in calculateFinalItemPrice:', error);
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

/**
 * Unified price calculation for consistent pricing across all modules
 * @param {Object} item - The order item
 * @param {Object} order - The order object
 * @returns {Object} - Standardized price breakdown
 */
const getUnifiedPriceBreakdown = (item, order = null) => {
  try {
    // **CRITICAL FIX: Add null/undefined validation**
    if (!item) {
      console.warn('getUnifiedPriceBreakdown: item is null or undefined');
      return null;
    }

    const quantity = item.quantity || 1;

    // 1. Original price (base price before any discounts)
    const originalPrice = item.price || item.priceAtAddition || 0;
    const originalTotal = originalPrice * quantity;

    // 2. Price after offer discount
    const discountedPrice = item.discountedPrice || originalPrice;
    const offerDiscount = originalPrice - discountedPrice;
    const offerDiscountTotal = offerDiscount * quantity;
    const priceAfterOffer = discountedPrice * quantity;

    // 3. Coupon discount (if applicable)
    let couponDiscount = 0;
    let couponProportion = 0;

    if (item.priceBreakdown && item.priceBreakdown.couponDiscount) {
      couponDiscount = item.priceBreakdown.couponDiscount;
      couponProportion = item.priceBreakdown.couponProportion || 0;
    } else if (item.couponDiscount) {
      couponDiscount = item.couponDiscount;
      couponProportion = item.couponProportion || 0;
    }

    // 4. Final price after all discounts
    const finalPrice = priceAfterOffer - couponDiscount;

    // 5. Tax calculation (proportional to item's contribution)
    let taxAmount = 0;
    if (order && order.tax && order.total) {
      // Calculate item's proportion of the order total (excluding tax)
      const orderSubtotal = order.total - order.tax;
      if (orderSubtotal > 0) {
        const itemProportion = finalPrice / orderSubtotal;
        taxAmount = order.tax * itemProportion;
      }
    }

    // 6. Final total including tax
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
      // Formatted values for display
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
  reapplyCouponBenefitsAfterCancellation
}
