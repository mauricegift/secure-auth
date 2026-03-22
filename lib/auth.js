const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const token =
    req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }
    next();
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
};
