const Product = require('../../models/productSchema');
const { HttpStatus } = require("../../helpers/status-code");
const searchProducts = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (query.length < 2) {
      return res.json([]);
    }

    const productsRaw = await Product.find({
      isListed: true,
      isDeleted: false,
      $or: [
        { model: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
      ],
    })
      .populate({
        path: 'category',
        match: { isListed: true }, // Only populate if category is listed
        select: 'isListed'
      })
      .select('model brand mainImage _id category')
      .limit(20); // Get more to account for filtering

    // Filter out products with unlisted categories
    const products = productsRaw
      .filter(product => product.category !== null)
      .slice(0, 10) // Limit to 10 results for performance
      .map(product => ({
        _id: product._id,
        model: product.model,
        brand: product.brand,
        mainImage: product.mainImage
      }));

    res.json(products);
  } catch (error) {
    console.error(`Error in searchProducts: ${error}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};

module.exports = { searchProducts };