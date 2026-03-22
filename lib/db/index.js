const mongoose = require("mongoose");
const config = require("../../config");
const { User } = require("./models");

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Database Connected");
    // Ensure the first-ever registered user is marked as super admin
    const hasSuperAdmin = await User.exists({ isSuperAdmin: true });
    if (!hasSuperAdmin) {
      const first = await User.findOne().sort({ createdAt: 1 });
      if (first) {
        await User.findByIdAndUpdate(first._id, { isSuperAdmin: true });
        console.log(`Super admin migrated: ${first.username}`);
      }
    }
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  User,
};
