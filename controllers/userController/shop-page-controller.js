const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const shopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    let query = { isListed: true, isDeleted: false };

    const categoryId = req.query.category;
    if (categoryId) {
      if (Array.isArray(categoryId)) {
        query.category = { $in: categoryId };
      } else {
        query.category = categoryId;
      }
    }

    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 50000;

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
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    // Apply price filter using salePrice (no offers)
    query.salePrice = { $gte: minPrice, $lte: maxPrice };

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get products for current page
    const paginatedProducts = await Product.find(query)
      .populate('category')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    // Set final price to sale price for all products (no offers)
    for (const product of paginatedProducts) {
      product.finalPrice = product.salePrice;
      product.regularPrice = product.regularPrice || product.salePrice;
    }

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

    let queryParams = new URLSearchParams();

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
      pagination: paginationData,
      currentPage: page,
      totalPages,
      totalProducts,
      categoryId,
      minPrice,
      maxPrice,
      sortOption,
      queryString: baseQueryString ? `&${baseQueryString}` : ''
    });
  } catch (error) {
    console.log(`Error in rendering Shop Page: ${error}`);
    res.status(500).send("Server Error");
  }
};

function generatePaginationArray(currentPage, totalPages) {
  let pages = [];

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