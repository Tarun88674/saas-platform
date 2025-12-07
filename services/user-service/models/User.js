const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true
    },

    name: String,

    password: {
      type: String,
      required: true,
      select: false  // ⬅️ VERY IMPORTANT SECURITY LINE
    },

    tenantId: {
      type: String,
      required: true,
      index: true
    },

    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      default: "EMPLOYEE"
    },

    status: {
      type: String,
      default: "active"
    }
  },
  { timestamps: true }
);

// Unique index per tenant
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
