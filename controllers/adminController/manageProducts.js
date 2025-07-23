const { HttpStatus } = require('../../helpers/statusCode');
const getAddProduct = async (req,res) => {
  try {
    res.render('manageProducts.ejs');
  } catch {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Server Error'
    });
  }
};
module.exports = {getAddProduct};