const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const { getActiveOfferForProduct, calculateDiscount } = require('../../utils/offerHelper');
const { URLSearchParams } = require('url');
const shopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const query = { isListed: true, isDeleted: false };
    const categoryId = req.query.category;
    if (categoryId) {
      if (Array.isArray(categoryId)) {
        query.category = { $in: categoryId };
      } else {
        query.category = categoryId;
      }
    }
    const brandFilter = req.query.brand;
    if (brandFilter) {
      if (Array.isArray(brandFilter)) {
        query.brand = { $in: brandFilter };
      } else {
        query.brand = brandFilter;
      }
    }
    // Comprehensive price validation
    let minPrice = 0;
    let maxPrice = 50000;
    let priceValidationErrors = [];

    // Validate minimum price
    if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
      const minPriceInput = req.query.minPrice;

      // Check if it's a valid number
      if (isNaN(minPriceInput) || minPriceInput === null) {
        priceValidationErrors.push('Minimum price must be a valid number');
        minPrice = 0;
      } else {
        const parsedMinPrice = parseFloat(minPriceInput);

        // Check for negative values
        if (parsedMinPrice < 0) {
          priceValidationErrors.push('Minimum price cannot be negative');
          minPrice = 0;
        }
        // Check for extremely large values
        else if (parsedMinPrice > 1000000) {
          priceValidationErrors.push('Minimum price cannot exceed ₹10,00,000');
          minPrice = 1000000;
        }
        // Check for decimal precision (max 2 decimal places)
        else if (parsedMinPrice % 1 !== 0 && parsedMinPrice.toString().split('.')[1]?.length > 2) {
          minPrice = Math.round(parsedMinPrice * 100) / 100;
        } else {
          minPrice = parsedMinPrice;
        }
      }
    }

    // Validate maximum price
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
      const maxPriceInput = req.query.maxPrice;

      // Check if it's a valid number
      if (isNaN(maxPriceInput) || maxPriceInput === null) {
        priceValidationErrors.push('Maximum price must be a valid number');
        maxPrice = 50000;
      } else {
        const parsedMaxPrice = parseFloat(maxPriceInput);

        // Check for negative values
        if (parsedMaxPrice < 0) {
          priceValidationErrors.push('Maximum price cannot be negative');
          maxPrice = 50000;
        }
        // Check for extremely large values
        else if (parsedMaxPrice > 1000000) {
          priceValidationErrors.push('Maximum price cannot exceed ₹10,00,000');
          maxPrice = 1000000;
        }
        // Check for decimal precision (max 2 decimal places)
        else if (parsedMaxPrice % 1 !== 0 && parsedMaxPrice.toString().split('.')[1]?.length > 2) {
          maxPrice = Math.round(parsedMaxPrice * 100) / 100;
        } else {
          maxPrice = parsedMaxPrice;
        }
      }
    }

    // Validate price range relationship
    if (minPrice > maxPrice) {
      priceValidationErrors.push('Minimum price cannot be greater than maximum price');
      // Auto-correct by swapping values
      const temp = minPrice;
      minPrice = maxPrice;
      maxPrice = temp;
    }

    // Ensure minimum range gap for better UX
    if (maxPrice - minPrice < 10 && minPrice > 0 && maxPrice < 50000) {
      // Only adjust if both values are user-provided and the gap is too small
      if (req.query.minPrice && req.query.maxPrice) {
        maxPrice = minPrice + 10;
      }
    }
    const sortOption = req.query.sort || 'recommended';
    let sortQuery = {};
    switch (sortOption) {
    case 'price-asc':
      sortQuery = { salePrice: 1 };
      break;
    case 'price-desc':
      sortQuery = { salePrice: -1 };
      break;
    case 'date-desc':
      sortQuery = { createdAt: -1 };
      break;
    case 'stock-desc':
      sortQuery = { stock: -1 };
      break;
    case 'name-asc':
      sortQuery = { model: 1 };
      break;
    case 'name-desc':
      sortQuery = { model: -1 };
      break;
    default:
      sortQuery = { createdAt: -1 };
      break;
    }
    const priceBuffer = Math.max(100, maxPrice * 0.2);
    query.salePrice = { $gte: Math.max(0, minPrice - priceBuffer), $lte: maxPrice + priceBuffer };
    const allProducts = await Product.find(query)
      .populate({
        path: 'category',
        match: { isListed: true }
      })
      .sort(sortQuery)
      .limit(1000);
    const validProducts = allProducts.filter(product => product.category !== null);
    const productsWithOffers = [];
    for (const product of validProducts) {
      const pricingOptions = [];
      if (product.salePrice < product.regularPrice) {
        const saleDiscountAmount = product.regularPrice - product.salePrice;
        const saleDiscountPercentage = (saleDiscountAmount / product.regularPrice) * 100;
        pricingOptions.push({
          type: 'sale',
          title: 'Sale Price',
          finalPrice: product.salePrice,
          discountAmount: saleDiscountAmount,
          discountPercentage: saleDiscountPercentage,
          offer: null
        });
      }
      const offer = await getActiveOfferForProduct(product._id, product.category._id, product.regularPrice);
      if (offer) {
        const { discountAmount: offerDiscountAmount, discountPercentage: offerDiscountPercentage, finalPrice: offerFinalPrice } = calculateDiscount(offer, product.regularPrice);
        pricingOptions.push({
          type: 'offer',
          title: offer.title,
          finalPrice: offerFinalPrice,
          discountAmount: offerDiscountAmount,
          discountPercentage: offerDiscountPercentage,
          offer: offer
        });
      }
      pricingOptions.push({
        type: 'regular',
        title: null,
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
      product.activeOffer = bestOption.offer;
      product.bestOfferType = bestOption.type;
      if (product.finalPrice >= minPrice && product.finalPrice <= maxPrice) {
        productsWithOffers.push(product);
      }
    }
    if (sortOption === 'price-asc') {
      productsWithOffers.sort((a, b) => a.finalPrice - b.finalPrice);
    } else if (sortOption === 'price-desc') {
      productsWithOffers.sort((a, b) => b.finalPrice - a.finalPrice);
    } else if (sortOption === 'name-asc') {
      productsWithOffers.sort((a, b) => a.model.localeCompare(b.model));
    } else if (sortOption === 'name-desc') {
      productsWithOffers.sort((a, b) => b.model.localeCompare(a.model));
    }
    const totalProducts = productsWithOffers.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const paginatedProducts = productsWithOffers.slice(skip, skip + limit);
    const paginationData = {
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      pages: generatePaginationArray(page, totalPages)
    };
    const categories = await Category.find({ isListed: true });
    const brands = await Product.distinct('brand', { isListed: true, isDeleted: false });
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'page') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.set(key, value);
        }
      }
    }
    const baseQueryString = queryParams.toString();
    res.render('shop-page', {
      products: paginatedProducts,
      categories,
      brands,
      pagination: paginationData,
      currentPage: page,
      totalPages,
      totalProducts,
      categoryId,
      brandFilter,
      minPrice,
      maxPrice,
      sortOption,
      queryString: baseQueryString ? `&${baseQueryString}` : '',
      priceValidationErrors: priceValidationErrors.length > 0 ? priceValidationErrors : null
    });
  } catch (error) {
    console.error(`Error in rendering Shop Page: ${error}`);
    res.status(500).send('Server Error');
  }
};
function generatePaginationArray(currentPage, totalPages) {
  const pages = [];
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4);
  }
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
}
module.exports = { shopPage };