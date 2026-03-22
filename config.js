const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

module.exports = {
  PORT: process.env.PORT || 3738,
  NODE_ENV: process.env.NODE_ENV || "development",

  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/secureauth",

  JWT_SECRET:
    process.env.JWT_SECRET || "secure_auth_jwt_secret_change_in_production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "3d",

  COOKIE_MAX_AGE: 3 * 24 * 60 * 60 * 1000,

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
