/**
 * Tax Configuration for Indian E-commerce
 * Centralized GST rate management
 */

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

/**
 * Calculate GST amount for given subtotal
 * @param {number} subtotal - Amount before tax
 * @param {number} rate - GST rate (default: current rate)
 * @returns {number} GST amount
 */
const calculateGST = (subtotal, rate = TAX_CONFIG.GST.CURRENT_RATE) => {
  if (!subtotal || subtotal <= 0) return 0;
  
  const gstAmount = subtotal * rate;
  
  if (TAX_CONFIG.DISPLAY.ROUND_TO_NEAREST_PAISA) {
    return Math.round(gstAmount * 100) / 100;
  }
  
  return parseFloat(gstAmount.toFixed(TAX_CONFIG.CALCULATION.PRECISION));
};

/**
 * Calculate total amount including GST
 * @param {number} subtotal - Amount before tax
 * @param {number} rate - GST rate (default: current rate)
 * @returns {object} Breakdown of amounts
 */
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

/**
 * Get current GST rate
 * @returns {number} Current GST rate
 */
const getCurrentGSTRate = () => TAX_CONFIG.GST.CURRENT_RATE;

/**
 * Get GST percentage as string
 * @returns {string} GST percentage (e.g., "8%")
 */
const getGSTPercentageString = () => `${(TAX_CONFIG.GST.CURRENT_RATE * 100).toFixed(0)}%`;

module.exports = {
  TAX_CONFIG,
  calculateGST,
  calculateTotalWithGST,
  getCurrentGSTRate,
  getGSTPercentageString
};
