const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const { getActiveOfferForProduct, calculateDiscount } = require("../../utils/offer-helper");

const {HttpStatus} = require('../../helpers/status-code')

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.id;

    const product = await Product.findById(productId).populate("category");
    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).render("pageNotFound");
    }

    // **INDEPENDENT OFFER COMPARISON LOGIC (NO COMBINING)**
    console.log(`🏷️ CALCULATING BEST OFFER FOR PRODUCT: ${product.model}`);
    console.log(`   Regular Price: ₹${product.regularPrice}`);
    console.log(`   Sale Price: ₹${product.salePrice}`);

    // Step 1: Calculate all possible pricing options INDEPENDENTLY
    const pricingOptions = [];

    // Option 1: Sale Price (admin-set discount from regular price)
    if (product.salePrice < product.regularPrice) {
      const saleDiscountAmount = product.regularPrice - product.salePrice;
      const saleDiscountPercentage = (saleDiscountAmount / product.regularPrice) * 100;

      pricingOptions.push({
        type: 'sale',
        title: 'Sale Price',
        description: 'Special discounted price',
        finalPrice: product.salePrice,
        discountAmount: saleDiscountAmount,
        discountPercentage: saleDiscountPercentage,
        offer: null
      });

      console.log(`   Sale Option: ₹${product.salePrice} (${saleDiscountPercentage.toFixed(1)}% off regular price)`);
    }

    // Option 2: Best Available Offer applied DIRECTLY to Regular Price (NOT sale price)
    const activeOffer = await getActiveOfferForProduct(
      product._id,
      product.category._id,
      product.regularPrice  // Apply offers to REGULAR price for independent comparison
    );

    if (activeOffer) {
      const { discountAmount: offerDiscountAmount, discountPercentage: offerDiscountPercentage, finalPrice: offerFinalPrice } = calculateDiscount(
        activeOffer,
        product.regularPrice  // Calculate from regular price, not sale price
      );

      pricingOptions.push({
        type: 'offer',
        title: activeOffer.title,
        description: activeOffer.description,
        finalPrice: offerFinalPrice,
        discountAmount: offerDiscountAmount,  // This is the actual offer discount amount
        discountPercentage: offerDiscountPercentage,  // This matches admin panel configuration
        offer: activeOffer
      });

      console.log(`   Offer Option: ₹${offerFinalPrice} (${offerDiscountPercentage.toFixed(1)}% off regular price) - ${activeOffer.title}`);
    }

    // Option 3: Regular Price (no discount)
    pricingOptions.push({
      type: 'regular',
      title: null,
      description: null,
      finalPrice: product.regularPrice,
      discountAmount: 0,
      discountPercentage: 0,
      offer: null
    });

    // Step 2: Find the best option (lowest final price)
    const bestOption = pricingOptions.reduce((best, current) => {
      return current.finalPrice < best.finalPrice ? current : best;
    });

    console.log(`   🏆 BEST OPTION: ${bestOption.type} - ₹${bestOption.finalPrice} (${bestOption.discountPercentage.toFixed(1)}% off)`);
    console.log(`   📊 DISCOUNT MATCHES ADMIN PANEL: ${bestOption.discountPercentage.toFixed(1)}%`);

    // Step 3: Apply the best option to the product
    product.finalPrice = bestOption.finalPrice;
    product.discountAmount = bestOption.discountAmount;
    product.discountPercentage = bestOption.discountPercentage;
    product.bestOfferTitle = bestOption.title;
    product.bestOfferDescription = bestOption.description;
    product.activeOffer = bestOption.offer;
    product.bestOfferType = bestOption.type;

    // Get related products
    const relatedProducts = await Product.aggregate([
      { 
        $match: { 
          _id: { $ne: product._id }, 
          isListed: true, 
          isDeleted: false,
          category: product.category._id 
        }
      },
      { $sample: { size: 4 } },
    ]);

    // Apply same independent comparison logic to related products
    for (const relatedProduct of relatedProducts) {
      // Step 1: Calculate all possible pricing options INDEPENDENTLY
      const relatedPricingOptions = [];

      // Option 1: Sale Price (from regular price)
      if (relatedProduct.salePrice < relatedProduct.regularPrice) {
        const saleDiscountAmount = relatedProduct.regularPrice - relatedProduct.salePrice;
        const saleDiscountPercentage = (saleDiscountAmount / relatedProduct.regularPrice) * 100;

        relatedPricingOptions.push({
          type: 'sale',
          title: 'Sale Price',
          finalPrice: relatedProduct.salePrice,
          discountAmount: saleDiscountAmount,
          discountPercentage: saleDiscountPercentage,
          offer: null
        });
      }

      // Option 2: Best Available Offer applied DIRECTLY to Regular Price
      const relatedOffer = await getActiveOfferForProduct(
        relatedProduct._id,
        relatedProduct.category,
        relatedProduct.regularPrice  // Apply to regular price for independent comparison
      );

      if (relatedOffer) {
        const { discountAmount: offerDiscountAmount, discountPercentage: offerDiscountPercentage, finalPrice: offerFinalPrice } = calculateDiscount(
          relatedOffer,
          relatedProduct.regularPrice  // Calculate from regular price
        );

        relatedPricingOptions.push({
          type: 'offer',
          title: relatedOffer.title,
          finalPrice: offerFinalPrice,
          discountAmount: offerDiscountAmount,  // Actual offer discount
          discountPercentage: offerDiscountPercentage,  // Matches admin panel
          offer: relatedOffer
        });
      }

      // Option 3: Regular Price
      relatedPricingOptions.push({
        type: 'regular',
        title: null,
        finalPrice: relatedProduct.regularPrice,
        discountAmount: 0,
        discountPercentage: 0,
        offer: null
      });

      // Step 2: Find the best option for related product
      const bestRelatedOption = relatedPricingOptions.reduce((best, current) => {
        return current.finalPrice < best.finalPrice ? current : best;
      });

      // Step 3: Apply the best option
      relatedProduct.finalPrice = bestRelatedOption.finalPrice;
      relatedProduct.discountAmount = bestRelatedOption.discountAmount;
      relatedProduct.discountPercentage = bestRelatedOption.discountPercentage;
      relatedProduct.bestOfferTitle = bestRelatedOption.title;
      relatedProduct.activeOffer = bestRelatedOption.offer;
      relatedProduct.bestOfferType = bestRelatedOption.type;
    }

    let cartCount = 0;
    let wishlistCount = 0;
    let isInCart = false;
    let isWishlisted = false;

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        isInCart = cart.items.some(item => item.product.toString() === productId);
      }

      const wishlist = await Wishlist.findOne({ user: userId });
      if (wishlist) {
        wishlistCount = wishlist.items.length;
        isWishlisted = wishlist.items.some(item => item.product.toString() === productId);
      }
    }

    // Log the product data for debugging
    console.log('Product details with offer:', {
      model: product.model,
      regularPrice: product.regularPrice,
      finalPrice: product.finalPrice,
      discountPercentage: product.discountPercentage,
      hasOffer: !!product.activeOffer,
      offerTitle: product.activeOffer?.title
    });

    res.render("product-details", {
      product,
      relatedProducts,
      isInCart,
      isWishlisted,
      cartCount,
      wishlistCount,
      user: userId ? { id: userId } : null,
      isAuthenticated: !!userId,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("pageNotFound");
  }
};

module.exports = { productDetails };

