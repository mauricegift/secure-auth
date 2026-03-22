const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/secureauth",

  JWT_SECRET:
    process.env.JWT_SECRET || "secure_auth_jwt_secret_change_in_production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "3d",

  COOKIE_MAX_AGE: 3 * 24 * 60 * 60 * 1000,

  ALLOWED_ORIGINS: (
    process.env.ALLOWED_ORIGINS ||
    "https://secureauth.giftedtech.co.ke,http://localhost:5000,https://yourdomain.com"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
