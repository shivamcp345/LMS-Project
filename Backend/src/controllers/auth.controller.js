const authService = require("../services/auth.service");
const User = require("../models/User");

const {
  signupSchema,
  loginSchema,
  forgetpasswordSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  googleLoginSchema,
} = require("../validators/auth.validation");

const signup = async (req, res) => {
  try {
    const { error, value } = signupSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user = await authService.signup(value);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { user, token } = await authService.login(value);

    return res.status(200).json({
      success: true,
      message: "Login successfully",
      data: {
        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};
const googleLogin = async (req, res) => {
  try {
    const { error, value } = googleLoginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { user, token } = await authService.googleLogin(value.credential);

    return res.status(200).json({
      success: true,
      message: "Google sign-in successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};
const sendEmailVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await authService.sendEmailVerificationOtp(email);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};
const verifyEmailOtp = async (req, res) => {
  try {
    const { error, value } = verifyEmailOtpSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const result = await authService.verifyEmailOtp(value);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const adminLogin = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { user, token } = await authService.adminLogin(value);

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message,
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const { name, email, mobile, address } = req.body;

    if (!name && mobile === undefined && address === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one profile field is required",
      });
    }

    const user = await authService.updateProfile(req.user.userId, {
      name,
      email,
      mobile,
      address,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        address: user.address,
        isEmailVerified: user.isEmailVerified,
        profileDetails: user.profileDetails,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfileDetails = async (req, res) => {
  try {
    if (
      !req.body.profileDetails ||
      typeof req.body.profileDetails !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message: "Profile details are required",
      });
    }

    const user = await authService.updateProfileDetails(
      req.user.userId,
      req.body.profileDetails,
    );

    return res.status(200).json({
      success: true,
      message: "Profile details updated successfully",
      data: { profileDetails: user.profileDetails },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter your current password and a new password of at least 8 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must include uppercase, lowercase and a special character",
      });
    }

    await authService.changeOwnPassword(
      req.user.userId,
      currentPassword,
      newPassword,
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const allowed = [
      "aadhaar",
      "pan",
      "tenth",
      "twelfth",
      "degree",
      "postgraduate",
    ];
    const { key } = req.params;
    if (!allowed.includes(key))
      return res
        .status(400)
        .json({ success: false, message: "Invalid document type" });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Choose a PDF, JPG or PNG document" });

    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (
      key === "aadhaar" &&
      req.body.number &&
      !/^\d{12}$/.test(String(req.body.number))
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Aadhaar number must be 12 digits" });
    }
    if (
      key === "pan" &&
      req.body.number &&
      !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(String(req.body.number).toUpperCase())
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid PAN number" });
    }

    user.profileDetails = user.profileDetails || {};
    user.profileDetails.documents = user.profileDetails.documents || {};
    user.profileDetails.documents[key] =
      user.profileDetails.documents[key] || {};
    user.profileDetails.documents[key].fileKey = req.file.filename;
    user.profileDetails.documents[key].uploadedAt = new Date();
    if (key === "aadhaar" || key === "pan")
      user.profileDetails.documents[key].number = String(req.body.number || "")
        .trim()
        .toUpperCase();
    user.markModified("profileDetails");
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: { profileDetails: user.profileDetails },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const uploadGovernmentId = async (req, res) => {
  // Backward-compatible handler for the legacy government-id route.
  // The current UI uses /profile/document/:key, but older clients may still call this route.
  const legacyIdMap = { 1: "aadhaar", 2: "pan" };
  const key =
    legacyIdMap[String(req.params.id)] ||
    String(req.params.id || "").toLowerCase();
  if (
    !["aadhaar", "pan", "tenth", "twelfth", "degree", "postgraduate"].includes(
      key,
    )
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid document type" });
  }
  req.params.key = key;
  return uploadDocument(req, res);
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.profilePicture = `/uploads/${req.file.filename}`;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: {
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const uploadBackgroundPicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Background picture is required",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.backgroundPicture = `/uploads/${req.file.filename}`;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Background picture uploaded successfully",
      data: {
        backgroundPicture: user.backgroundPicture,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -resetPasswordToken -resetPasswordExpires -resetPasswordOtp -resetPasswordOtpExpires -resetPasswordVerifiedAt -emailVerificationOtp -emailVerificationOtpExpires",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        address: user.address,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
        backgroundPicture: user.backgroundPicture,
        profileDetails: user.profileDetails,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getAdminDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Welcome to admin dashboard",
      data: {
        userId: req.user.userId,
        role: req.user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgetpasswordSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    await authService.sendPasswordResetOtp(value.email);

    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("Password reset request failed:", error.message);
    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, password reset instructions have been sent.",
    });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and password are required",
      });
    }

    await authService.resetPassword({
      email: String(email).trim().toLowerCase(),
      otp,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to reset password. Check the OTP and password requirements, then try again.",
    });
  }
};
const sendPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await authService.sendPasswordResetOtp(String(email).trim().toLowerCase());

    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, a password reset OTP has been sent.",
    });
  } catch (error) {
    console.error("Password reset OTP request failed:", error.message);
    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, a password reset OTP has been sent.",
    });
  }
};
const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const result = await authService.verifyPasswordResetOtp({
      email: String(email).trim().toLowerCase(),
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: "Invalid OTP or expired password reset request.",
    });
  }
};
module.exports = {
  signup,
  login,
  googleLogin,
  adminLogin,
  getProfile,
  getAdminDashboard,
  forgotPassword,
  resetPassword,
  verifyEmailOtp,
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  updateProfile,
  updateProfileDetails,
  changeOwnPassword,
  uploadGovernmentId,
  uploadDocument,
  uploadProfilePicture,
  uploadBackgroundPicture,
};
