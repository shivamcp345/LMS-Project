const express = require("express");
const {
  signup,
  login,
  googleLogin,
  adminLogin,
  getProfile,
  getAdminDashboard,
  forgotPassword,
  resetPassword,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  updateProfile,
  updateProfileDetails,
  changeOwnPassword,
  uploadGovernmentId,
  uploadDocument,
  uploadProfilePicture,
  uploadBackgroundPicture,
} = require("../controllers/auth.controller");
const upload = require("../config/multer");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");

const router = express.Router();

const uploadGovernmentDocument = (req, res, next) => {
  upload.governmentDocument.single("governmentId")(req, res, (error) => {
    if (error) {
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        success: false,
        message: error.message,
      });
    }

    return next();
  });
};

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const otpRequestLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });
const otpVerifyLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const passwordResetLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post("/signup", loginLimit, signup);
router.post("/login", loginLimit, login);
router.post("/logout", (req, res) => res.status(200).json({ success: true, message: "Logged out" }));
router.post("/google", loginLimit, googleLogin);
router.post("/admin/login", loginLimit, adminLogin);
router.post("/reset-password", passwordResetLimit, resetPassword);
router.post("/verify-email-otp", otpVerifyLimit, verifyEmailOtp);
router.post("/send-email-otp", otpRequestLimit, sendEmailVerificationOtp);
router.post("/send-password-reset-otp", otpRequestLimit, sendPasswordResetOtp);
router.post("/verify-password-reset-otp", otpVerifyLimit, verifyPasswordResetOtp);

router.get("/me", authenticate, getProfile);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.put("/profile/details", authenticate, updateProfileDetails);
router.put("/profile/password", authenticate, changeOwnPassword);
router.put(
  "/profile/government-id/:id",
  authenticate,
  uploadGovernmentDocument,
  uploadGovernmentId,
);
router.put(
  "/profile/document/:key",
  authenticate,
  uploadGovernmentDocument,
  uploadDocument,
);
router.put(
  "/profile/picture",
  authenticate,
  upload.single("profilePicture"),
  uploadProfilePicture,
);
router.put(
  "/profile/background",
  authenticate,
  upload.single("backgroundPicture"),
  uploadBackgroundPicture,
);

router.get("/admin-dashboard", authorize("admin"), getAdminDashboard);

router.post("/forgot-password", otpRequestLimit, forgotPassword);
module.exports = router;
