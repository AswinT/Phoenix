const Wallet = require('../../models/walletSchema');
const Order = require('../../models/orderSchema');
const { calculateDiscount, getUnifiedPriceBreakdown } = require('../../utils/offerHelper');
const { HttpStatus } = require('../../helpers/statusCode');
const { calculateRefundAmount, validateRefundForPaymentMethod } = require('../../helpers/moneyCalculator');
const getWallet = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect('/login');
    }
    const page = parseInt(req.query.page) || 1;
    const filter = req.query.filter || 'all';
    const transactionsPerPage = 5;
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || !wallet.transactions) {
      return res.render('wallet', {
        wallet: {
          balance: 0,
          transactions: [],
          totalTransactions: 0,
          currentPage: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          filter: filter
        }
      });
    }
    let allTransactions = wallet.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(transaction => {
        const transactionDate = new Date(transaction.date);
        const formattedDate = transactionDate.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata'
        });
        const formattedTime = transactionDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        });
        return {
          type: transaction.type,
          amount: transaction.amount.toFixed(2),
          reason: transaction.reason,
          date: formattedDate,
          time: formattedTime,
          fullDateTime: `${formattedDate}, ${formattedTime}`,
          orderId: transaction.orderId
        };
      });
    if (filter !== 'all') {
      allTransactions = allTransactions.filter(transaction => transaction.type === filter);
    }
    const totalTransactions = allTransactions.length;
    const totalPages = Math.ceil(totalTransactions / transactionsPerPage);
    const startIndex = (page - 1) * transactionsPerPage;
    const endIndex = startIndex + transactionsPerPage;
    const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
    const formattedWallet = {
      balance: wallet.balance,
      transactions: paginatedTransactions,
      totalTransactions: totalTransactions,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      filter: filter,
      transactionsPerPage: transactionsPerPage
    };
    res.render('wallet', {
      wallet: formattedWallet
    });
  } catch (error) {
    console.error('Error in getWallet:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('error', { message: 'Internal server error' });
  }
};
const safeCalculation = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};
const calculateProportionalTaxRefund = (item, order) => {
  try {
    if (!order?.tax || order.tax <= 0 || !item || !order.items?.length) {
      return 0;
    }
    const itemPriceBreakdown = getUnifiedPriceBreakdown(item, order);
    if (!itemPriceBreakdown?.finalPrice) {
      return 0;
    }
    const itemFinalPrice = itemPriceBreakdown.finalPrice;
    let totalOrderFinalPrice = 0;
    for (const orderItem of order.items) {
      const itemBreakdown = getUnifiedPriceBreakdown(orderItem, order);
      totalOrderFinalPrice += itemBreakdown?.finalPrice || 0;
    }
    if (totalOrderFinalPrice <= 0) {
      return 0;
    }
    const proportionalTax = (itemFinalPrice / totalOrderFinalPrice) * order.tax;
    return Number(proportionalTax.toFixed(2));
  } catch (error) {
    console.error('Error calculating proportional tax:', error.message);
    return 0;
  }
};
const processCancelRefund = async (userId, order, productId = null) => {
  try {
    if (!userId || !order) {
      console.error('Invalid userId or order for cancel refund');
      return false;
    }
    const existingWallet = await Wallet.findOne({ userId });
    if (existingWallet) {
      let existingRefund;
      if (productId) {
        existingRefund = existingWallet.transactions.find(transaction =>
          transaction.orderId?.toString() === order._id.toString() &&
          transaction.type === 'credit' &&
          transaction.reason.includes('cancelled item') &&
          transaction.reason.includes(productId)
        );
      } else {
        existingRefund = existingWallet.transactions.find(transaction =>
          transaction.orderId?.toString() === order._id.toString() &&
          transaction.type === 'credit' &&
          (transaction.reason.includes('cancelled items in order') ||
           transaction.reason.includes('remaining') ||
           transaction.reason.includes('order #'))
        );
        if (!existingRefund) {
          const individualRefunds = existingWallet.transactions.filter(transaction =>
            transaction.orderId?.toString() === order._id.toString() &&
            transaction.type === 'credit' &&
            transaction.reason.includes('cancelled item')
          );
          if (individualRefunds.length > 0) {
            const totalIndividualRefunds = individualRefunds.reduce((sum, refund) => sum + refund.amount, 0);
            const remainingRefund = order.total - totalIndividualRefunds;
            if (remainingRefund > 0.01) {
              const wallet = existingWallet;
              wallet.balance += remainingRefund;
              wallet.transactions.push({
                type: 'credit',
                amount: remainingRefund,
                orderId: order._id,
                reason: 'Refund for remaining amount in cancelled order',
                date: new Date()
              });
              await wallet.save();
              console.log(`Remaining refund processed: ₹${remainingRefund}`);
              return true;
            } else {
              return true;
            }
          }
        }
      }
      if (existingRefund) {
        return true;
      }
    }
    let refundResult;
    if (productId) {
      refundResult = calculateRefundAmount('INDIVIDUAL_ITEM', order, productId);
    } else {
      refundResult = calculateRefundAmount('REMAINING_ORDER', order);
    }
    if (!refundResult.success) {
      return true;
    }
    const validation = validateRefundForPaymentMethod(order, refundResult.amount);
    if (!validation.shouldRefund) {
      return true;
    }
    const finalRefundAmount = validation.refundAmount;
    if (finalRefundAmount <= 0) {
      return true;
    }
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: 0,
        transactions: []
      });
    }
    const oldBalance = wallet.balance;
    wallet.balance += finalRefundAmount;
    const newTransaction = {
      type: 'credit',
      amount: finalRefundAmount,
      orderId: order._id,
      reason: refundResult.reason,
      date: new Date()
    };
    wallet.transactions.push(newTransaction);
    await wallet.save();
    console.log(`Cancel refund processed: ₹${finalRefundAmount} for ${refundResult.reason}`);
    return true;
  } catch (error) {
    console.error('Error processing cancel refund:', error);
    return false;
  }
};
const processReturnRefund = async (userId, order, productId = null) => {
  try {
    if (!userId || !order) {
      console.error('Invalid userId or order for return refund');
      return false;
    }
    const existingWallet = await Wallet.findOne({ userId });
    if (existingWallet) {
      const existingRefund = existingWallet.transactions.find(transaction =>
        transaction.orderId?.toString() === order._id.toString() &&
        transaction.type === 'credit' &&
        transaction.reason.includes('return') &&
        (productId ? transaction.reason.includes(productId) : transaction.reason.includes('order'))
      );
      if (existingRefund) {
        return true;
      }
    }
    let refundResult;
    if (productId) {
      refundResult = calculateRefundAmount('INDIVIDUAL_ITEM', order, productId);
      const item = order.items.find(i => i.product.toString() === productId.toString());
      if (!item || item.status !== 'Returned') {
        return false;
      }
    } else {
      const returnedItems = order.items.filter(item => item.status === 'Returned');
      if (returnedItems.length === 0) {
        return true;
      }
      refundResult = calculateRefundAmount('REMAINING_ORDER', order);
    }
    if (!refundResult.success) {
      return true;
    }
    const validation = validateRefundForPaymentMethod(order, refundResult.amount);
    if (!validation.shouldRefund) {
      return true;
    }
    const finalRefundAmount = validation.refundAmount;
    if (finalRefundAmount <= 0) {
      return true;
    }
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: 0,
        transactions: []
      });
    }
    const oldBalance = wallet.balance;
    wallet.balance += finalRefundAmount;
    const newTransaction = {
      type: 'credit',
      amount: finalRefundAmount,
      orderId: order._id,
      reason: refundResult.reason.replace('cancelled', 'returned'),
      date: new Date()
    };
    wallet.transactions.push(newTransaction);
    await wallet.save();
    console.log(`Return refund processed: ₹${finalRefundAmount} for ${refundResult.reason}`);
    return true;
  } catch (error) {
    console.error('Error processing return refund:', error);
    return false;
  }
};
module.exports = {
  getWallet,
  processCancelRefund,
  processReturnRefund
};