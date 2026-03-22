const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  profilePicture: {
    data: Buffer,
    contentType: String,
  },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isSuperAdmin: { type: Boolean, default: false },
  isDisabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

module.exports = { User };
