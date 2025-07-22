const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const { getActiveOfferForProduct, calculateDiscount } = require('../../utils/offerHelper');
const {HttpStatus} = require('../../helpers/statusCode');
const productDetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.productId || req.params.id;

    // Validate ObjectId format
    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HttpStatus.NOT_FOUND).render('user/page-404');
    }

    const product = await Product.findById(productId).populate('category');
    if (!product || !product.isListed || product.isDeleted || !product.category || !product.category.isListed) {
      return res.status(HttpStatus.NOT_FOUND).render('user/page-404');
    }
    const pricingOptions = [];
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
    }
    const activeOffer = await getActiveOfferForProduct(
      product._id,
      product.category._id,
      product.regularPrice
    );
    if (activeOffer) {
      const { discountAmount: offerDiscountAmount, discountPercentage: offerDiscountPercentage, finalPrice: offerFinalPrice } = calculateDiscount(
        activeOffer,
        product.regularPrice
      );
      pricingOptions.push({
        type: 'offer',
        title: activeOffer.title,
        description: activeOffer.description,
        finalPrice: offerFinalPrice,
        discountAmount: offerDiscountAmount,
        discountPercentage: offerDiscountPercentage,
        offer: activeOffer
      });
    }
    pricingOptions.push({
      type: 'regular',
      title: null,
      description: null,
      finalPrice: product.regularPrice,
      discountAmount: 0,
      discountPercentage: 0,
      offer: null
    });
    const bestOption = pricingOptions.reduce((best, current) => {
      return current.finalPrice < best.finalPrice ? current : best;
    });
    product.finalPrice = bestOption.finalPrice;
    product.discountAmount = bestOption.discountAmount;
    product.discountPercentage = bestOption.discountPercentage;
    product.bestOfferTitle = bestOption.title;
    product.bestOfferDescription = bestOption.description;
    product.activeOffer = bestOption.offer;
    product.bestOfferType = bestOption.type;
    const relatedProducts = await Product.aggregate([
      {
        $match: {
          _id: { $ne: product._id },
          isListed: true,
          isDeleted: false,
          category: product.category._id
        }
      },
      { $sample: { size: 4 } }
    ]);
    for (const relatedProduct of relatedProducts) {
      const relatedPricingOptions = [];
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
      const relatedOffer = await getActiveOfferForProduct(
        relatedProduct._id,
        relatedProduct.category,
        relatedProduct.regularPrice
      );
      if (relatedOffer) {
        const { discountAmount: offerDiscountAmount, discountPercentage: offerDiscountPercentage, finalPrice: offerFinalPrice } = calculateDiscount(
          relatedOffer,
          relatedProduct.regularPrice
        );
        relatedPricingOptions.push({
          type: 'offer',
          title: relatedOffer.title,
          finalPrice: offerFinalPrice,
          discountAmount: offerDiscountAmount,
          discountPercentage: offerDiscountPercentage,
          offer: relatedOffer
        });
      }
      relatedPricingOptions.push({
        type: 'regular',
        title: null,
        finalPrice: relatedProduct.regularPrice,
        discountAmount: 0,
        discountPercentage: 0,
        offer: null
      });
      const bestRelatedOption = relatedPricingOptions.reduce((best, current) => {
        return current.finalPrice < best.finalPrice ? current : best;
      });
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
        cartCount = cart.items.length;
        isInCart = cart.items.some(item => item.product.toString() === productId);
      }
      const wishlist = await Wishlist.findOne({ user: userId });
      if (wishlist) {
        wishlistCount = wishlist.items.length;
        isWishlisted = wishlist.items.some(item => item.product.toString() === productId);
      }
    }
    res.render('user/product-details', {
      product,
      relatedProducts,
      isInCart,
      isWishlisted,
      cartCount,
      wishlistCount,
      user: userId ? { id: userId } : null,
      isAuthenticated: !!userId
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('pageNotFound');
  }
};
module.exports = { productDetails };
