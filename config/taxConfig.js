const TAX_CONFIG = {
  GST: {
    STANDARD_RATE: 0.18,      // 18% - Standard GST rate for most products
    REDUCED_RATE: 0.05,       // 5% - Essential items
    LUXURY_RATE: 0.28,        // 28% - Luxury items
    CURRENT_RATE: 0.08        // 8% - Current rate used in your system
  },
  
  DISPLAY: {
    SHOW_IN_CART: true,       // Show tax calculation in cart
    SHOW_BREAKDOWN: true,     // Show detailed tax breakdown
    ROUND_TO_NEAREST_PAISA: true  // Round to nearest paisa (0.01)
  },
  
  CALCULATION: {
    INCLUSIVE: false,         // false = tax added on top, true = tax included in price
    PRECISION: 2              // Decimal places for tax calculation
  }
};

const calculateGST = (subtotal, rate = TAX_CONFIG.GST.CURRENT_RATE) => {
  if (!subtotal || subtotal <= 0) return 0;
  
  const gstAmount = subtotal * rate;
  
  if (TAX_CONFIG.DISPLAY.ROUND_TO_NEAREST_PAISA) {
    return Math.round(gstAmount * 100) / 100;
  }
  
  return parseFloat(gstAmount.toFixed(TAX_CONFIG.CALCULATION.PRECISION));
};

const calculateTotalWithGST = (subtotal, rate = TAX_CONFIG.GST.CURRENT_RATE) => {
  const gstAmount = calculateGST(subtotal, rate);
  const total = subtotal + gstAmount;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    gst: gstAmount,
    total: parseFloat(total.toFixed(2)),
    gstRate: rate,
    gstPercentage: `${(rate * 100).toFixed(0)}%`
  };
};

const getCurrentGSTRate = () => TAX_CONFIG.GST.CURRENT_RATE;

const getGSTPercentageString = () => `${(TAX_CONFIG.GST.CURRENT_RATE * 100).toFixed(0)}%`;

module.exports = {
  TAX_CONFIG,
  calculateGST,
  calculateTotalWithGST,
  getCurrentGSTRate,
  getGSTPercentageString
};
