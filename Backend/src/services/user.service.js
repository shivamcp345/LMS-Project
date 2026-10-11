const User = require("../models/User");
const { hashPassword, isStrongPassword } = require("../utils/password");

const getAllUsers = async () => {
  const users = await User.find()
    .select(
      "-password -resetPasswordToken -resetPasswordExpires -resetPasswordOtp -resetPasswordOtpExpires -resetPasswordVerifiedAt -emailVerificationOtp -emailVerificationOtpExpires",
    )
    .sort({ createdAt: -1 });

  return users;
};

const createUser = async ({
  name,
  email,
  password,
  role,
  isActive,
}) => {
  const existingUser = await User.findOne({ email });

  if (!isStrongPassword(password)) {
    throw new Error("Password must be 8-30 characters with uppercase, lowercase and a special character");
  }

  if (!["user", "trainer"].includes(role || "user")) {
    throw new Error("Only student or trainer accounts can be created here");
  }

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "user",
    mobile: "",
    address: "",
    isActive: isActive ?? true,
    isEmailVerified: true,
  });

  return user;
};

const deleteUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    throw new Error("Admin users cannot be deleted");
  }

  await User.findByIdAndDelete(userId);

  return user;
};
const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  user.isActive = !user.isActive;
  await user.save();

  return user;
};

module.exports = {
  getAllUsers,
  createUser,
  deleteUser,
  toggleUserStatus,
};
