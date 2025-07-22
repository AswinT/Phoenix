const Product = require('../../models/productSchema');
const { HttpStatus } = require('../../helpers/statusCode');
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
        { brand: { $regex: query, $options: 'i' } }
      ]
    })
      .populate({
        path: 'category',
        match: { isListed: true },
        select: 'isListed'
      })
      .select('model brand mainImage _id category')
      .limit(20);
    const products = productsRaw
      .filter(product => product.category !== null)
      .slice(0, 10)
      .map(product => ({
        _id: product._id,
        model: product.model,
        brand: product.brand,
        mainImage: product.mainImage
      }));
    res.json(products);
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
module.exports = { searchProducts };
