const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const auth = require("../auth");
const config = require("../../config");
const { validateUsername, validateEmail, validatePassword, validatePhone } = require("../validation");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
});

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

function setCookieAndRespond(res, user, message) {
  const token = signToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: config.COOKIE_MAX_AGE,
  });
  res.json({
    success: true,
    message,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
  });
}

// POST /api/auth/signup
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json({ success: false, message: usernameErr });

    const emailErr = validateEmail(email);
    if (emailErr) return res.json({ success: false, message: emailErr });

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json({ success: false, message: passwordErr });

    const existingEmail = await db.User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) return res.json({ success: false, message: "That email is already registered" });

    const existingUsername = await db.User.findOne({ username: username.trim() });
    if (existingUsername) return res.json({ success: false, message: "That username is already taken" });

    const userCount = await db.User.countDocuments();
    const role = userCount === 0 ? "admin" : "user";
    const isSuperAdmin = userCount === 0;

    const hashed = await bcrypt.hash(password, 12);
    const user = await db.User.create({ username: username.trim(), email: email.toLowerCase().trim(), password: hashed, role, isSuperAdmin });
    setCookieAndRespond(res, user, role === "admin" ? "Welcome! You've been registered as admin." : "Registration successful");
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const identifier = (req.body.identifier || req.body.email || "").trim();
    const { password } = req.body;

    if (!identifier) return res.json({ success: false, message: "Username or email is required" });
    if (!password) return res.json({ success: false, message: "Password is required" });

    const user = await db.User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    });
    if (!user) return res.json({ success: false, message: "Invalid username/email or password" });

    if (user.isDisabled) {
      return res.json({ success: false, message: "Your account has been disabled. Contact support." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: "Invalid username/email or password" });

    setCookieAndRespond(res, user, "Login successful");
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", auth.requireAuth, async (req, res) => {
  try {
    const user = await db.User.findById(req.user.id).select("-password -profilePicture");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isDisabled) {
      res.clearCookie("token");
      return res.status(401).json({ success: false, message: "Account disabled", code: "ACCOUNT_DISABLED" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", auth.requireAuth, async (req, res) => {
  try {
    const user = await db.User.findById(req.user.id).select("-password -profilePicture");
    if (!user || user.isDisabled) {
      res.clearCookie("token");
      return res.status(401).json({ success: false, message: "Token refresh failed" });
    }
    const token = signToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: config.COOKIE_MAX_AGE,
    });
    res.json({ success: true, message: "Token refreshed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/avatar/:id
router.get("/avatar/:id", async (req, res) => {
  try {
    const user = await db.User.findById(req.params.id).select("profilePicture");
    if (!user || !user.profilePicture?.data) {
      return res.status(404).json({ success: false, message: "No avatar" });
    }
    res.set("Content-Type", user.profilePicture.contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(user.profilePicture.data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/auth/profile  — accepts JSON { phone?, avatar? (base64 data URL) }
router.patch("/profile", auth.requireAuth, async (req, res) => {
  try {
    const updates = {};

    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone || "").trim();
      if (phone !== "") {
        const phoneErr = validatePhone(phone);
        if (phoneErr) return res.json({ success: false, message: phoneErr });

        const existingPhone = await db.User.findOne({ phone, _id: { $ne: req.user.id } });
        if (existingPhone) return res.json({ success: false, message: "That phone number is already linked to another account" });
      }
      updates.phone = phone;
    }

    if (req.body.avatar && typeof req.body.avatar === "string") {
      const match = req.body.avatar.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
      if (!match) return res.json({ success: false, message: "Invalid avatar format" });
      const contentType = match[1];
      const base64Data = match[2];
      if (!contentType.startsWith("image/")) return res.json({ success: false, message: "Only image files are allowed" });
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length > 5 * 1024 * 1024) return res.json({ success: false, message: "Image must be under 5 MB" });
      updates.profilePicture = { data: buffer, contentType };
    }

    const user = await db.User.findByIdAndUpdate(req.user.id, updates, { returnDocument: "after" }).select(
      "-password -profilePicture"
    );
    res.json({ success: true, message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/change-password — forces logout after success
router.post("/change-password", auth.requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.json({ success: false, message: "All password fields are required" });
    }
    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: "New passwords do not match" });
    }

    const passwordErr = validatePassword(newPassword);
    if (passwordErr) return res.json({ success: false, message: passwordErr });

    const user = await db.User.findById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      return res.json({ success: false, message: "New password must be different from your current password" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.clearCookie("token");
    res.json({ success: true, message: "Password changed. Please log in with your new password.", forceLogout: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
