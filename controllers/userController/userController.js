const categoryController = require('../../controllers/userController/categoryController');
const Product = require('../../models/productSchema');
const { getActiveOfferForProduct, calculateDiscount } = require('../../utils/offerHelper');
const { HttpStatus } = require('../../helpers/statusCode');
const pageNotFound = async (req, res) => {
  try {
    res.render('page-404');
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};
const loadHomePage = async (req, res) => {
  try {
    const categories = await categoryController.getCategories();
    const LIMIT = 4;
    const topSellingProductsRaw = await Product.find({ isListed: true, isDeleted: false })
      .populate({
        path: 'category',
        match: { isListed: true }
      })
      .sort({ stock: -1 })
      .limit(LIMIT * 2);
    const topSellingProducts = topSellingProductsRaw
      .filter(product => product.category !== null)
      .slice(0, LIMIT);
    const newArrivalsRaw = await Product.find({ isListed: true, isDeleted: false })
      .populate({
        path: 'category',
        match: { isListed: true }
      })
      .sort({ createdAt: -1  })
      .limit(LIMIT * 2);
    const newArrivals = newArrivalsRaw
      .filter(product => product.category !== null)
      .slice(0, LIMIT);
    for (const product of topSellingProducts) {
      const offer = await getActiveOfferForProduct(
        product._id,
        product.category._id,
        product.regularPrice
      );
      const { discountPercentage, discountAmount, finalPrice } = calculateDiscount(
        offer,
        product.regularPrice
      );
      product.activeOffer = offer;
      product.discountPercentage = discountPercentage;
      product.discountAmount = discountAmount;
      product.finalPrice = finalPrice;
      product.regularPrice = product.regularPrice || product.salePrice;
    }
    for (const product of newArrivals) {
      const offer = await getActiveOfferForProduct(
        product._id,
        product.category._id,
        product.regularPrice
      );
      const { discountPercentage, discountAmount, finalPrice } = calculateDiscount(
        offer,
        product.regularPrice
      );
      product.activeOffer = offer;
      product.discountPercentage = discountPercentage;
      product.discountAmount = discountAmount;
      product.finalPrice = finalPrice;
      product.regularPrice = product.regularPrice || product.salePrice;
    }
    return res.render('home', {
      categories,
      topSellingProducts,
      newArrivals,
      user: req.session.user_id ? { id: req.session.user_id } : null,
      isAuthenticated: !!req.session.user_id
    });
  } catch (error) {
    console.log(`Error in rendering Home Page: ${error}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};
const getAboutPage = async (req, res) => {
  try {
    res.render('about');
  } catch (error) {
    console.log(`Error in rendering About Page: ${error}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};
module.exports = {
  loadHomePage,
  pageNotFound,
  getAboutPage,
};