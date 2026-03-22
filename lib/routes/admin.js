const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const auth = require("../auth");
const { validatePassword, validatePhone } = require("../validation");

const router = express.Router();

// GET /api/admin/users
router.get("/users", auth.requireAdmin, async (req, res) => {
  try {
    const users = await db.User.find().select("-password -profilePicture").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: block any modification to the super admin by a non-super-admin
async function guardSuperAdmin(req, res) {
  const target = await db.User.findById(req.params.id).select("isSuperAdmin");
  if (!target) return false; // let downstream handle 404
  if (target.isSuperAdmin && req.user.id !== req.params.id) {
    const requester = await db.User.findById(req.user.id).select("isSuperAdmin");
    if (!requester || !requester.isSuperAdmin) {
      res.json({ success: false, message: "The platform owner cannot be modified by other admins" });
      return true; // blocked
    }
  }
  return false; // not blocked
}

// PATCH /api/admin/users/:id
router.patch("/users/:id", auth.requireAdmin, async (req, res) => {
  try {
    if (await guardSuperAdmin(req, res)) return;
    const isSelf = req.user.id === req.params.id;
    const { phone, role, email, username, newPassword } = req.body;
    const updates = {};

    if (phone !== undefined) {
      const trimmed = (phone || "").trim();
      if (trimmed !== "") {
        const phoneErr = validatePhone(trimmed);
        if (phoneErr) return res.json({ success: false, message: phoneErr });

        const existingPhone = await db.User.findOne({ phone: trimmed, _id: { $ne: req.params.id } });
        if (existingPhone) return res.json({ success: false, message: "That phone number is already linked to an account" });
      }
      updates.phone = trimmed;
    }

    // Admins cannot change their own role, email, or username
    if (!isSelf) {
      if (role !== undefined) updates.role = role;

      if (email !== undefined) {
        const trimmedEmail = (email || "").trim().toLowerCase();
        if (trimmedEmail) {
          const existingEmail = await db.User.findOne({ email: trimmedEmail, _id: { $ne: req.params.id } });
          if (existingEmail) return res.json({ success: false, message: "That email is already in use" });
          updates.email = trimmedEmail;
        }
      }

      if (username !== undefined) {
        const trimmedUsername = (username || "").trim();
        if (trimmedUsername) {
          const existingUsername = await db.User.findOne({ username: trimmedUsername, _id: { $ne: req.params.id } });
          if (existingUsername) return res.json({ success: false, message: "That username is already taken" });
          updates.username = trimmedUsername;
        }
      }
    }

    if (newPassword && newPassword.trim()) {
      const passwordErr = validatePassword(newPassword.trim());
      if (passwordErr) return res.json({ success: false, message: passwordErr });
      updates.password = await bcrypt.hash(newPassword.trim(), 12);
    }

    const user = await db.User.findByIdAndUpdate(req.params.id, updates, { returnDocument: "after" }).select(
      "-password -profilePicture"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id/toggle-disable
router.patch("/users/:id/toggle-disable", auth.requireAdmin, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.json({ success: false, message: "You cannot disable your own account" });
    }
    if (await guardSuperAdmin(req, res)) return;
    const user = await db.User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isDisabled = !user.isDisabled;
    await user.save();
    res.json({
      success: true,
      message: user.isDisabled ? "User disabled" : "User enabled",
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", auth.requireAdmin, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.json({ success: false, message: "You cannot delete your own account" });
    }
    if (await guardSuperAdmin(req, res)) return;
    const { adminPassword } = req.body;
    if (!adminPassword) {
      return res.json({ success: false, message: "Your password is required to confirm deletion" });
    }
    const admin = await db.User.findById(req.user.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    const valid = await bcrypt.compare(adminPassword, admin.password);
    if (!valid) {
      return res.json({ success: false, message: "Incorrect password — deletion cancelled" });
    }
    const user = await db.User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
