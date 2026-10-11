const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const isStrongPassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,30}$/.test(String(password || ""));
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

// Hash normal password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Compare normal password with hashed password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate password reset token
const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  return {
    resetToken,
    hashedToken,
  };
};

// Hash reset token received from user
const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};
const generateEmailOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = {
  hashPassword,
  comparePassword,
  generateResetToken,
  hashResetToken,
  generateEmailOtp,
  isStrongPassword,
  hashOtp,
};
