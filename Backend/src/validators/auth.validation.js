const Joi = require("joi");
const { isStrongPassword } = require("../utils/password");
const passwordSchema = Joi.string().custom((value, helpers) => isStrongPassword(value) ? value : helpers.error("string.passwordPolicy")).messages({ "string.passwordPolicy": "Password must be 8–30 characters with uppercase, lowercase and a special character" });


const signupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  password: passwordSchema.required(),
});


const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  password: Joi.string()
    .required(),
});


const forgetpasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),
});


const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .trim()
    .required(),

  password: passwordSchema.required(),
});

const verifyEmailOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});

const googleLoginSchema = Joi.object({
  credential: Joi.string().trim().required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgetpasswordSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  googleLoginSchema,
};
