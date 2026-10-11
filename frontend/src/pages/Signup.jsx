import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";

import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";

import {
  signupUser,
  sendEmailVerificationOtp,
  verifyEmailOtp,
} from "../api/auth";

import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // EMAIL VERIFICATION
  // =========================

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerificationError, setEmailVerificationError] = useState("");
  const [emailVerificationLoading, setEmailVerificationLoading] =
    useState(false);

  // =========================
  // PASSWORD UI
  // =========================

  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // =========================
  // WATCH VALUES
  // =========================

  const email = watch("email") || "";
  const password = watch("password") || "";
  const confirmPassword = watch("confirmPassword") || "";

  // =========================
  // PASSWORD RULES
  // =========================

  const passwordRules = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === password;

  // =========================
  // SEND EMAIL OTP
  // =========================

  async function handleSendOtp() {
    setServerError("");
    setEmailVerificationError("");

    if (!email) {
      setEmailVerificationError("Please enter your email first.");
      return;
    }

    setEmailVerificationLoading(true);

    try {
      await sendEmailVerificationOtp(email);

      setEmailVerificationSent(true);
      setEmailVerified(false);
      setEmailOtp("");
    } catch (err) {
      setEmailVerificationError(
        err.response?.data?.message || "Could not send OTP. Please try again.",
      );
    } finally {
      setEmailVerificationLoading(false);
    }
  }

  // =========================
  // VERIFY EMAIL OTP
  // =========================

  async function handleVerifyOtp() {
    setEmailVerificationError("");

    if (emailOtp.length !== 6) {
      setEmailVerificationError("Please enter the 6-digit OTP.");
      return;
    }

    setEmailVerificationLoading(true);

    try {
      await verifyEmailOtp({
        email,
        otp: emailOtp,
      });

      setEmailVerified(true);
      setEmailVerificationSent(false);
      setEmailVerificationError("");
    } catch (err) {
      setEmailVerificationError(
        err.response?.data?.message || "Invalid OTP. Please try again.",
      );
    } finally {
      setEmailVerificationLoading(false);
    }
  }

  // =========================
  // SIGNUP
  // =========================

  async function onSubmit(formData) {
    setServerError("");

    // Email must be verified
    if (!emailVerified) {
      setServerError("Please verify your email before creating your account.");
      return;
    }

    // Password validation
    if (
      !passwordRules.minLength ||
      !passwordRules.uppercase ||
      !passwordRules.lowercase ||
      !passwordRules.special
    ) {
      setServerError("Please fulfill all password requirements.");
      return;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      setServerError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await signupUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      login(data);
      navigate("/dashboard");
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
          "Could not create your account. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Set up your account in a minute."
      title="Create your account"
      subtitle="Start learning or managing courses right away."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* =========================
            SERVER ERROR
        ========================= */}

        {serverError && (
          <div className="banner banner--error">{serverError}</div>
        )}

        {/* =========================
            FULL NAME
        ========================= */}

        <FormField
          label="Full name"
          placeholder="Jordan Lee"
          error={errors.name?.message}
          {...register("name", {
            required: "Full name is required",

            pattern: {
              value: /^[A-Za-z]+(?: +[A-Za-z]*)*$/,
              message: "Name can contain only alphabets and spaces",
            },

            minLength: {
              value: 2,
              message: "Name must be at least 2 characters",
            },

            maxLength: {
              value: 50,
              message: "Name cannot exceed 50 characters",
            },
          })}
        />

        {/* =========================
            EMAIL
        ========================= */}

        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <FormField
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email", {
                  required: "Email is required",

                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },

                  onChange: () => {
                    // Changing email means old verification
                    // is no longer valid
                    setEmailVerified(false);
                    setEmailVerificationSent(false);
                    setEmailVerificationError("");
                    setEmailOtp("");
                  },
                })}
              />
            </div>

            {/* VERIFY EMAIL BUTTON */}

            {email && !emailVerified && (
              <button
                type="button"
                className="btn btn--secondary"
                style={{
                  marginTop: 30,
                  whiteSpace: "nowrap",
                }}
                onClick={handleSendOtp}
                disabled={emailVerificationLoading || !!errors.email || !email}
              >
                {emailVerificationLoading ? "Sending..." : "Verify Email"}
              </button>
            )}
          </div>

          {/* =========================
              OTP SECTION
          ========================= */}

          {emailVerificationSent && !emailVerified && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 10,
              }}
            >
              <input
                className="field__input"
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                value={emailOtp}
                onChange={(e) =>
                  setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
              />

              <button
                type="button"
                className="btn btn--primary"
                onClick={handleVerifyOtp}
                disabled={emailVerificationLoading || emailOtp.length !== 6}
              >
                {emailVerificationLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          )}

          {/* =========================
              VERIFIED MESSAGE
          ========================= */}

          {emailVerified && (
            <div
              style={{
                marginTop: 8,
                color: "#16a34a",
                fontWeight: 600,
              }}
            >
              ✓ Email verified successfully
            </div>
          )}

          {/* =========================
              EMAIL ERROR
          ========================= */}

          {emailVerificationError && (
            <div className="field__error" style={{ marginTop: 6 }}>
              {emailVerificationError}
            </div>
          )}
        </div>

        {/* =========================
            PASSWORD
        ========================= */}

        <div className="field">
          <span className="field__label field__label--between">
            <span>Password</span>
          </span>

          <input
            className="field__input"
            type="password"
            placeholder="At least 8 characters"
            {...register("password", {
              required: "Password is required",

              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },

              maxLength: {
                value: 30,
                message: "Password cannot exceed 30 characters",
              },

              validate: {
                uppercase: (value) =>
                  /[A-Z]/.test(value) ||
                  "Password must contain at least one uppercase letter",

                lowercase: (value) =>
                  /[a-z]/.test(value) ||
                  "Password must contain at least one lowercase letter",

                special: (value) =>
                  /[^A-Za-z0-9]/.test(value) ||
                  "Password must contain at least one special character",
              },
            })}
            onFocus={() => setShowPasswordRules(true)}
          />

          {errors.password?.message && (
            <span className="field__error">{errors.password.message}</span>
          )}
        </div>

        {/* =========================
            PASSWORD REQUIREMENTS
        ========================= */}

        {showPasswordRules && (
          <div
            style={{
              marginTop: -8,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#f8f9fc",
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Password must contain:
            </div>

            <div
              style={{
                color: passwordRules.minLength ? "#16a34a" : "#dc2626",
                marginBottom: 5,
                fontWeight: 500,
              }}
            >
              {passwordRules.minLength ? "✓" : "✕"} At least 8 characters
            </div>

            <div
              style={{
                color: passwordRules.uppercase ? "#16a34a" : "#dc2626",
                marginBottom: 5,
                fontWeight: 500,
              }}
            >
              {passwordRules.uppercase ? "✓" : "✕"} One uppercase letter
            </div>

            <div
              style={{
                color: passwordRules.lowercase ? "#16a34a" : "#dc2626",
                marginBottom: 5,
                fontWeight: 500,
              }}
            >
              {passwordRules.lowercase ? "✓" : "✕"} One lowercase letter
            </div>

            <div
              style={{
                color: passwordRules.special ? "#16a34a" : "#dc2626",
                fontWeight: 500,
              }}
            >
              {passwordRules.special ? "✓" : "✕"} One special character
            </div>
          </div>
        )}

        {/* =========================
            RE-ENTER PASSWORD
        ========================= */}

        <FormField
          label="Re-enter password"
          type="password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Please confirm your password",

            validate: (value) => value === password || "Passwords do not match",
          })}
        />

        {/* =========================
            PASSWORD MATCH
        ========================= */}

        {confirmPassword.length > 0 && (
          <div
            style={{
              marginTop: -8,
              paddingLeft: 4,
              color: passwordsMatch ? "#16a34a" : "#dc2626",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
          </div>
        )}

        {/* =========================
            CREATE ACCOUNT
        ========================= */}

        <button
          className="btn btn--primary"
          type="submit"
          disabled={submitting}
        >
          {submitting && <span className="spinner" />}

          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
