const Wallet = require('../models/walletSchema');

/**
 * Middleware to add wallet balance to response locals for authenticated users
 */
const addWalletBalance = async (req, res, next) => {
  try {
    // Only add wallet balance for authenticated users
    if (req.session.user_id) {
      const wallet = await Wallet.findOne({ userId: req.session.user_id });
      res.locals.walletBalance = wallet ? wallet.balance : 0;
    } else {
      res.locals.walletBalance = 0;
    }
    next();
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.locals.walletBalance = 0;
    next();
  }
};

module.exports = {
  addWalletBalance
};
