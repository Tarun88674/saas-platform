const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    domain: {
      type: String,
      unique: true
    },
    status: {
      type: String,
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
