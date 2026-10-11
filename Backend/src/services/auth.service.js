const User = require("../models/User");

const {
  hashPassword,
  comparePassword,
  isStrongPassword,
  hashOtp,
} = require("../utils/password");
const EmailVerification = require("../models/EmailVerification");

const { generateToken } = require("../utils/jwt");
const { generateEmailOtp } = require("../utils/password");
const { sendEmail } = require("./email.service");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const env = require("../config/env");

const googleClient = new OAuth2Client();
// SIGNUP
const signup = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  const verification = await EmailVerification.findOne({
    email,
    verified: true,
  });

  if (!verification) {
    throw new Error("Please verify your email before signing up");
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    isEmailVerified: true,
  });

  await EmailVerification.deleteOne({ email });

  return user;
};
// LOGIN
const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.isActive === false) {
    throw new Error("This account is inactive. Contact an administrator.");
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({
    userId: user._id,
    role: user.role,
  });

  return {
    user,
    token,
  };
};
// GOOGLE LOGIN
const googleLogin = async (credential) => {
  if (!env.googleClientId) {
    const error = new Error("Google login is not configured");
    error.statusCode = 500;
    throw error;
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    const error = new Error("Google sign-in could not be verified");
    error.statusCode = 401;
    throw error;
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    const error = new Error("Please use a Google account with a verified email");
    error.statusCode = 401;
    throw error;
  }

  const email = payload.email.trim().toLowerCase();
  let user = await User.findOne({ googleId: payload.sub }).select("+password");

  if (!user) {
    user = await User.findOne({ email }).select("+password");

    if (user?.googleId && user.googleId !== payload.sub) {
      const error = new Error("This email is already linked to another Google account");
      error.statusCode = 409;
      throw error;
    }

    if (user) {
      user.googleId = payload.sub;
      user.isEmailVerified = true;
      await user.save();
    } else {
      const name = (payload.name || email.split("@")[0]).trim().slice(0, 50);
      const password = await hashPassword(crypto.randomBytes(32).toString("hex"));

      user = await User.create({
        name: name.length >= 2 ? name : "Google User",
        email,
        password,
        googleId: payload.sub,
        isEmailVerified: true,
      });
    }
  }

  if (user.isActive === false) {
    throw new Error("This account is inactive. Contact an administrator.");
  }

  const token = generateToken({
    userId: user._id,
    role: user.role,
  });

  return { user, token };
};
const sendEmailVerificationOtp = async (email) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const otp = generateEmailOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await EmailVerification.findOneAndUpdate(
    { email },
    {
      email,
      otp: hashOtp(otp),
      expiresAt,
      attempts: 0,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  await sendEmail({
    to: email,
    subject: "Learnly - Email Verification OTP",
    text: `Your Learnly email verification OTP is ${otp}. This OTP is valid for 10 minutes.`,
  });

  return {
    email,
    expiresAt,
  };
};
const verifyEmailOtp = async ({ email, otp }) => {
  const verification = await EmailVerification.findOne({ email });

  if (!verification) {
    throw new Error("OTP not found. Please request a new OTP");
  }

  if (verification.attempts >= 5) {
    await EmailVerification.deleteOne({ email });
    throw new Error("Too many incorrect attempts. Please request a new OTP");
  }

  if (verification.expiresAt < new Date()) {
    await EmailVerification.deleteOne({ email });
    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (verification.otp !== hashOtp(otp)) {
    verification.attempts += 1;
    if (verification.attempts >= 5) await EmailVerification.deleteOne({ email });
    else await verification.save();
    throw new Error("Invalid OTP");
  }

  verification.verified = true;
  await verification.save();

  return {
    email,
    verified: true,
  };
};
const adminLogin = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.isActive === false) {
    throw new Error("This account is inactive. Contact an administrator.");
  }

  // Only admin can use admin login
  if (user.role !== "admin") {
    const error = new Error("Admin access required");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({
    userId: user._id,
    role: user.role,
  });

  return {
    user,
    token,
  };
};
// RESET PASSWORD
const resetPassword = async ({ email, otp, password }) => {
  if (!isStrongPassword(password)) throw new Error("Password must be 8–30 characters with uppercase, lowercase and a special character");
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("No account found with this email");
  }

  if (!user.resetPasswordOtp) {
    throw new Error("Please request a new password reset OTP");
  }

  if (
    !user.resetPasswordOtpExpires ||
    user.resetPasswordOtpExpires < new Date()
  ) {
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordVerifiedAt = null;

    await user.save();

    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (user.resetPasswordOtpAttempts >= 5) {
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordVerifiedAt = null;
    user.resetPasswordOtpAttempts = 0;
    await user.save();
    throw new Error("Too many incorrect attempts. Please request a new OTP");
  }

  if (user.resetPasswordOtp !== hashOtp(otp)) {
    user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
    await user.save();
    throw new Error("Invalid OTP");
  }

  if (
    !user.resetPasswordVerifiedAt ||
    Date.now() - new Date(user.resetPasswordVerifiedAt).getTime() > 10 * 60 * 1000
  ) {
    throw new Error("Please verify the email OTP again before setting a new password");
  }

  const hashedPassword = await hashPassword(password);

  user.password = hashedPassword;

  // Clear OTP after successful password reset
  user.resetPasswordOtp = null;
  user.resetPasswordOtpExpires = null;
  user.resetPasswordVerifiedAt = null;
  user.resetPasswordOtpAttempts = 0;

  // Also clear old reset-token data
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Learnly - Password changed successfully",
      text: "Your Learnly password was changed successfully. For security, your new password is not included in email. If you did not make this change, contact the administrator immediately.",
    });
  } catch (emailError) {
    console.error("Password confirmation email could not be sent:", emailError.message);
  }

  return true;
};

const sendPasswordResetOtp = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("No account found with this email");
  }

  const otp = generateEmailOtp();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.resetPasswordOtp = hashOtp(otp);
  user.resetPasswordOtpExpires = expiresAt;
  user.resetPasswordVerifiedAt = null;
  user.resetPasswordOtpAttempts = 0;

  await user.save();

  await sendEmail({
    to: email,
    subject: "Learnly - Password Reset OTP",
    text: `Your Learnly password reset OTP is ${otp}. This OTP is valid for 10 minutes.`,
  });

  return {
    email,
    expiresAt,
  };
};
const verifyPasswordResetOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("No account found with this email");
  }

  if (!user.resetPasswordOtp) {
    throw new Error("OTP not found. Please request a new OTP");
  }

  if (
    !user.resetPasswordOtpExpires ||
    user.resetPasswordOtpExpires < new Date()
  ) {
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordVerifiedAt = null;

    await user.save();

    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (user.resetPasswordOtpAttempts >= 5) {
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordOtpAttempts = 0;
    await user.save();
    throw new Error("Too many incorrect attempts. Please request a new OTP");
  }

  if (user.resetPasswordOtp !== hashOtp(otp)) {
    user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
    await user.save();
    throw new Error("Invalid OTP");
  }

  user.resetPasswordVerifiedAt = new Date();
  await user.save();

  return {
    email,
    verified: true,
  };
};
const updateProfile = async (userId, { name, email, mobile, address }) => {
  const user = await User.findById(userId);


  if (!user) {
    throw new Error("User not found");
  }

  // Email is the immutable account identifier. Changes must go through a
  // dedicated re-verification flow rather than silently changing the login identity.

  if (name) {
    user.name = name;
  }

  if (mobile !== undefined) {
    user.mobile = mobile.trim();
  }

  if (address !== undefined) {
    user.address = address.trim();
  }

  await user.save();

  return user;
};

const updateProfileDetails = async (userId, profileDetails) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const current = user.profileDetails || {};
  const currentDocs = current.documents || {};
  const incomingDocs = profileDetails.documents || {};
  const documentKeys = ["aadhaar", "pan", "tenth", "twelfth", "degree", "postgraduate"];
  const documents = {};
  for (const key of documentKeys) {
    documents[key] = {
      number: incomingDocs[key]?.number ?? currentDocs[key]?.number ?? "",
      fileKey: currentDocs[key]?.fileKey || incomingDocs[key]?.fileKey || "",
      uploadedAt: currentDocs[key]?.uploadedAt || incomingDocs[key]?.uploadedAt || null,
    };
  }

  const normalizedAddressDetails = {
    street: profileDetails.addressDetails?.street || "",
    city: profileDetails.addressDetails?.city || "",
    state: profileDetails.addressDetails?.state || "",
    pinCode: profileDetails.addressDetails?.pinCode || "",
    country: profileDetails.addressDetails?.country || "India",
  };

  user.address = normalizedAddressDetails.street.trim();

  user.profileDetails = {
    personalInfo: {
      dateOfBirth: profileDetails.personalInfo?.dateOfBirth || "",
      gender: profileDetails.personalInfo?.gender || "",
    },
    educationDetails: {
      qualification: profileDetails.educationDetails?.qualification || "",
      institution: profileDetails.educationDetails?.institution || "",
      graduationYear: profileDetails.educationDetails?.graduationYear || "",
    },
    parentDetails: {
      name: profileDetails.parentDetails?.name || "",
      relation: profileDetails.parentDetails?.relation || "",
      mobile: profileDetails.parentDetails?.mobile || "",
      email: profileDetails.parentDetails?.email || "",
    },
    addressDetails: normalizedAddressDetails,
    documents,
  };
  user.markModified("profileDetails");
  await user.save();
  return user;
};

const changeOwnPassword = async (userId, currentPassword, newPassword) => {
  if (!isStrongPassword(newPassword)) throw new Error("Password must be 8–30 characters with uppercase, lowercase and a special character");
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("User not found");
  }

  const matches = await comparePassword(currentPassword, user.password);

  if (!matches) {
    throw new Error("Current password is incorrect");
  }

  user.password = await hashPassword(newPassword);
  await user.save();
};

module.exports = {
  signup,
  login,
  googleLogin,
  adminLogin,
  resetPassword,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  updateProfile,
  updateProfileDetails,
  changeOwnPassword,
};
