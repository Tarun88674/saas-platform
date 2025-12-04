const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true
    },
    name: {
      type: String
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      default: "active"
    }
  },
  { timestamps: true }
);

// Compound index for fast tenant-based lookup
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
