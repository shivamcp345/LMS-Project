const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 charcters"],
      maxlength: [50, "Name cannot exceed 50 charcters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 charcters"],
      select: true,
    },
    role: {
      type: String,
      enum: ["user", "trainer", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    emailVerificationOtp: {
      type: String,
      default: null,
    },

    emailVerificationOtpExpires: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordOtpAttempts: { type: Number, default: 0 },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
    resetPasswordVerifiedAt: {
      type: Date,
      default: null,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    backgroundPicture: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    profileDetails: {
      personalInfo: {
        dateOfBirth: { type: String, trim: true, default: "" },
        gender: { type: String, trim: true, default: "" },
      },
      educationDetails: {
        qualification: { type: String, trim: true, default: "" },
        institution: { type: String, trim: true, default: "" },
        graduationYear: { type: String, trim: true, default: "" },
      },
      parentDetails: {
        name: { type: String, trim: true, default: "" },
        relation: { type: String, trim: true, default: "" },
        mobile: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, lowercase: true, default: "" },
      },
      addressDetails: {
        street: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        pinCode: { type: String, trim: true, default: "" },
        country: { type: String, trim: true, default: "India" },
      },
      documents: {
        aadhaar: {
          number: { type: String, trim: true, default: "" },
          fileKey: { type: String, trim: true, default: "" },
          uploadedAt: { type: Date, default: null },
        },
        pan: {
          number: { type: String, trim: true, default: "" },
          fileKey: { type: String, trim: true, default: "" },
          uploadedAt: { type: Date, default: null },
        },
        tenth: {
          fileKey: { type: String, trim: true, default: "" },
          uploadedAt: { type: Date, default: null },
        },
        twelfth: {
          fileKey: { type: String, trim: true, default: "" },
          uploadedAt: { type: Date, default: null },
        },
        degree: {
          fileKey: { type: String, trim: true, default: "" },
          uploadedAt: { type: Date, default: null },
        },
        postgraduate: {
          fileKey: { type: String, trim: true, default: "" },
          uploadedAt: { type: Date, default: null },
        },
        // Legacy slots retained so existing records remain readable during migration.
        governmentId1: {
          type: { type: String, trim: true, default: "" },
          number: { type: String, trim: true, default: "" },
          fileUrl: { type: String, trim: true, default: "" },
          fileKey: { type: String, trim: true, default: "" },
        },
        governmentId2: {
          type: { type: String, trim: true, default: "" },
          number: { type: String, trim: true, default: "" },
          fileUrl: { type: String, trim: true, default: "" },
          fileKey: { type: String, trim: true, default: "" },
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
