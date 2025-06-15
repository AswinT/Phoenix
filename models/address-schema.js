const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  address: [{
    addressType: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    city: { 
      type: String, 
      required: true 
    },
    landMark: { 
      type: String, 
      required: true 
    },
    state: { 
      type: String, 
      required: true 
    },
    pincode: { 
      type: Number, 
      required: true 
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Phone number must start with 6, 7, 8, or 9 and be 10 digits long"
      }
    },
    altPhone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[6-9]\d{9}$/.test(v);
        },
        message: "Alternate phone number must start with 6, 7, 8, or 9 and be 10 digits long"
      }
    }
  }]
}, { timestamps: true });

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
