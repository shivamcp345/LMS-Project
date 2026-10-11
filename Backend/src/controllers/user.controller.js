const userService = require("../services/user.service");
const authService = require("../services/auth.service");
const User = require("../models/User");
const Batch = require("../models/Batch");
const BatchStudent = require("../models/BatchStudent");
const path = require("path");
const fs = require("fs");

const privateUserFields = "-password -resetPasswordToken -resetPasswordExpires -resetPasswordOtp -resetPasswordOtpExpires -resetPasswordVerifiedAt -emailVerificationOtp -emailVerificationOtpExpires";

async function trainerHasStudent(req, studentId) {
  if (req.user.role !== "trainer") return false;
  const batches = await BatchStudent.find({ student: studentId }).distinct("batch");
  return Boolean(await Batch.exists({ _id: { $in: batches }, trainer: req.user.userId, isDeleted: { $ne: true } }));
}

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      isActive,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const user = await userService.createUser({
      name,
      email,
      password,
      role,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        address: user.address,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
        backgroundPicture: user.backgroundPicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own account",
      });
    }

    const user = await userService.deleteUser(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
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
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    const user = await userService.toggleUserStatus(id);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const allowedFields = ["name", "mobile", "address", "profileDetails"];

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: "Profile details are required" });
    }
    if (Object.hasOwn(body, "email") || Object.hasOwn(body, "password")) {
      return res.status(400).json({ success: false, message: "Email and password cannot be changed" });
    }
    if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
      return res.status(400).json({ success: false, message: "Unsupported profile field" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!["user", "trainer"].includes(user.role)) {
      return res.status(400).json({ success: false, message: "Only students and trainers can be updated" });
    }
    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 50)) {
      return res.status(400).json({ success: false, message: "Name must be between 2 and 50 characters" });
    }

    if (body.profileDetails && typeof body.profileDetails !== "object") {
      return res.status(400).json({ success: false, message: "Profile details must be an object" });
    }
    const details = body.profileDetails;
    const pinCode = details?.addressDetails?.pinCode;
    const aadhaar = details?.documents?.aadhaar?.number || "";
    const pan = details?.documents?.pan?.number || "";
    if (pinCode && (typeof pinCode !== "string" || !/^\d{6}$/.test(pinCode))) {
      return res.status(400).json({ success: false, message: "PIN code must contain exactly 6 digits" });
    }
    if (aadhaar && (typeof aadhaar !== "string" || !/^\d{12}$/.test(aadhaar))) {
      return res.status(400).json({ success: false, message: "Aadhaar number must contain 12 digits" });
    }
    if (pan && (typeof pan !== "string" || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan.toUpperCase()))) {
      return res.status(400).json({ success: false, message: "Enter a valid PAN number" });
    }

    const { profileDetails, ...basicDetails } = body;
    await authService.updateProfile(id, basicDetails);

    if (profileDetails) {
      const safeDetails = { ...profileDetails };
      if (profileDetails.documents) {
        safeDetails.documents = {};
        for (const key of ["aadhaar", "pan"]) {
          if (profileDetails.documents[key]) {
            safeDetails.documents[key] = { number: profileDetails.documents[key].number || "" };
          }
        }
      }
      await authService.updateProfileDetails(id, safeDetails);
    }

    const updatedUser = await User.findById(id).select(privateUserFields);
    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateUserDocument = async (req, res) => {
  try {
    const { id, key } = req.params;
    if (!["aadhaar", "pan", "tenth", "twelfth", "degree", "postgraduate"].includes(key)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Choose a PDF, JPG or PNG document" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!["user", "trainer"].includes(user.role)) {
      return res.status(400).json({ success: false, message: "Only student and trainer documents can be updated here" });
    }
    const number = String(req.body.number || "").trim().toUpperCase();
    if (key === "aadhaar" && number && !/^\d{12}$/.test(number)) {
      return res.status(400).json({ success: false, message: "Aadhaar number must contain 12 digits" });
    }
    if (key === "pan" && number && !/^[A-Z]{5}\d{4}[A-Z]$/.test(number)) {
      return res.status(400).json({ success: false, message: "Enter a valid PAN number" });
    }
    user.profileDetails = user.profileDetails || {};
    user.profileDetails.documents = user.profileDetails.documents || {};
    const document = user.profileDetails.documents[key] || {};
    user.profileDetails.documents[key] = {
      ...document.toObject?.(),
      fileKey: req.file.filename,
      uploadedAt: new Date(),
      ...(key === "aadhaar" || key === "pan" ? { number } : {}),
    };
    user.markModified("profileDetails");
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: await User.findById(id).select(privateUserFields),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getDocumentFile = async (req, res) => {
  try {
    const allowed = ["aadhaar", "pan", "tenth", "twelfth", "degree", "postgraduate"];
    const { userId, key } = req.params;
    if (!allowed.includes(key)) return res.status(400).json({ success: false, message: "Invalid document type" });
    const isOwner = req.user.userId.toString() === userId;
    if (!isOwner && req.user.role !== "admin" && !await trainerHasStudent(req, userId)) return res.status(403).json({ success: false, message: "You are not allowed to view this document" });
    const user = await User.findById(userId).select("profileDetails");
    const fileKey = user?.profileDetails?.documents?.[key]?.fileKey;
    if (!fileKey) return res.status(404).json({ success: false, message: "Document not found" });
    const filePath = path.join(__dirname, "../../private-uploads", path.basename(fileKey));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "Document file is missing" });
    return res.sendFile(filePath);
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

const getGovernmentIdFile = async (req, res) => {
  try {
    const { userId, id } = req.params;
    if (!["governmentId1", "governmentId2"].includes(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid government ID slot",
      });
    }

    const isOwner = req.user.userId.toString() === userId;
    if (!isOwner && req.user.role !== "admin" && !await trainerHasStudent(req, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this document",
      });
    }

    const user = await User.findById(userId).select("profileDetails");
    const fileKey = user?.profileDetails?.documents?.[id]?.fileKey;
    if (!fileKey) {
      return res.status(404).json({
        success: false,
        message: "Government ID document not found",
      });
    }

    const privateUploadDir = path.join(__dirname, "../../private-uploads");
    const filePath = path.join(privateUploadDir, path.basename(fileKey));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Government ID document file is missing",
      });
    }

    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Could not read government ID document",
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  deleteUser,
  toggleUserStatus,
  updateUserProfile,
  updateUserDocument,
  getGovernmentIdFile,
  getDocumentFile,
};
