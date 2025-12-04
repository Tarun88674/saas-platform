const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Tenant DB connected");
  } catch (err) {
    console.error("❌ Tenant DB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
