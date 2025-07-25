const mongoose = require("mongoose");
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false, timestamps: true }
);
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceBreakdown: {
      originalPrice: {
        type: Number,
        required: true,
        min: 0
      },
      subtotal: {
        type: Number,
        required: true,
        min: 0
      },
      offerDiscount: {
        type: Number,
        default: 0,
        min: 0
      },
      offerTitle: {
        type: String,
        default: null
      },
      priceAfterOffer: {
        type: Number,
        required: true,
        min: 0
      },
      couponDiscount: {
        type: Number,
        default: 0,
        min: 0
      },
      couponProportion: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
      },
      finalPrice: {
        type: Number,
        required: true,
        min: 0
      }
    },
    status: {
      type: String,
      enum: [
        "Active",
        "Cancelled", 
        "Return Requested",
        "Returned"
      ],
      default: "Active",
      required: true
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    returnedAt: {
      type: Date,
    },
    returnReason: {
      type: String,
    },
    returnRequestedAt: {
      type: Date,
    },
    returnImages: [{
      type: String
    }]
  },
  { _id: false }
);
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  items: [orderItemSchema],
  shippingAddress: addressSchema,
  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay", "UPI", "Card", "Wallet"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: [
      "Pending",
      "Paid",
      "Failed",
      "Refunded",
      "Partially Refunded",
      "Refund Initiated",
      "Refund Processing",
      "Pending Payment"
    ],
    default: "Pending",
  },
  orderStatus: {
    type: String,
    enum: [
      "Placed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Partially Cancelled",
      "Return Requested",
      "Partially Return Requested",
      "Returned",
      "Partially Returned",
      "Pending Payment"
    ],
    default: "Placed",
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  shipping: {
    type: Number,
    required: true,
    default: 0,
  },
  tax: {
    type: Number,
    required: true,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  couponCode: {
    type: String,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  paymentRetryAttempts: {
    type: Number,
    default: 0,
  },
  lastPaymentAttempt: {
    type: Date,
  },
  paymentFailureReason: {
    type: String,
  },
  originalRazorpayOrderId: {
    type: String,
  },
  processedAt: {
    type: Date,
  },
  shippedAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  returnedAt: {
    type: Date,
  },
  returnRequestedAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
  },
  returnReason: {
    type: String,
  },
  trackingId: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
module.exports = mongoose.model("Order", orderSchema);