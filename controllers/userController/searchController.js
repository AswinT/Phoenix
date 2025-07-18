const Product = require('../../models/productSchema');
const { HttpStatus } = require("../../helpers/status-code");
const searchProducts = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (query.length < 2) {
      return res.json([]);
    }

    const products = await Product.find({
      isListed: true,
      isDeleted: false,
      $or: [
        { model: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
      ],
    })
      .select('model brand mainImage _id')
      .limit(10); // Limit to 10 results for performance

    res.json(products);
  } catch (error) {
    console.error(`Error in searchProducts: ${error}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};

module.exports = { searchProducts };