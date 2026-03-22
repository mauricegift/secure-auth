function validateUsername(username) {
  if (!username || !username.trim()) return "Username is required";
  if (!/^[a-z]{3,30}$/.test(username.trim()))
    return "Username must be 3–30 lowercase letters only (no numbers, spaces, or symbols)";
  return null;
}

function validateEmail(email) {
  if (!email || !email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return "Enter a valid email address (e.g. you@example.com)";
  return null;
}

function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter (A-Z)";
  if (!/[a-z]/.test(password))
    return "Password must include at least one lowercase letter (a-z)";
  if (!/[0-9]/.test(password))
    return "Password must include at least one number (0-9)";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include at least one special character (!@#$%^&*...)";
  return null;
}

function validatePhone(phone) {
  if (!phone || phone.trim() === "") return null;
  if (!/^\d{8,15}$/.test(phone.trim()))
    return "Enter 8–15 digits with country code, no spaces or symbols (e.g. 254712345678)";
  return null;
}

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validatePhone,
};
