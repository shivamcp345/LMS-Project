import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";

import {
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from "../api/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // SEND OTP
  // =========================

  async function handleSendOtp() {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    setSubmitting(true);

    try {
      await sendPasswordResetOtp(email.trim());

      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");

      setSuccess("OTP sent successfully to your email.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not send OTP. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // VERIFY OTP
  // =========================

  async function handleVerifyOtp() {
    setError("");
    setSuccess("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setSubmitting(true);

    try {
      await verifyPasswordResetOtp({
        email: email.trim(),
        otp,
      });

      setOtpVerified(true);
      setSuccess("OTP verified successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // RESET PASSWORD
  // =========================

  async function handleResetPassword(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Password must contain at least one special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword({
        email: email.trim(),
        otp,
        password,
      });

      setSuccess("Password reset successfully. Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not reset password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Locked out happens to everyone."
      title="Reset your password"
      subtitle="Verify your email with an OTP and create a new password."
      footer={
        <>
          Remembered it? <Link to="/login">Back to log in</Link>
        </>
      }
    >
      <form
        onSubmit={handleResetPassword}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* ERROR */}
        {error && <div className="banner banner--error">{error}</div>}

        {/* SUCCESS */}
        {success && (
          <div
            className="banner"
            style={{
              color: "#16a34a",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            {success}
          </div>
        )}

        {/* =========================
            EMAIL + VERIFY EMAIL
        ========================= */}

        <div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <FormField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");

                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtp("");
                }}
                placeholder="you@example.com"
                disabled={otpSent}
              />
            </div>

            {!otpSent && (
              <button
                type="button"
                className="forgot-verify-btn"
                onClick={handleSendOtp}
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Verify Email"}
              </button>
            )}
          </div>

          {/* =========================
              OTP
          ========================= */}

          {otpSent && !otpVerified && (
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
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                }}
                maxLength={6}
              />

              <button
                type="button"
                className="btn btn--primary"
                onClick={handleVerifyOtp}
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          )}

          {/* OTP VERIFIED */}
          {otpVerified && (
            <div
              style={{
                marginTop: 8,
                color: "#16a34a",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              ✓ Email verified successfully
            </div>
          )}
        </div>

        {/* =========================
            PASSWORD SECTION
        ========================= */}

        {otpVerified && (
          <>
            <FormField
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />

            {/* PASSWORD RULES */}

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
                  color: password.length >= 8 ? "#16a34a" : "#dc2626",
                  marginBottom: 5,
                }}
              >
                {password.length >= 8 ? "✓" : "✕"} At least 8 characters
              </div>

              <div
                style={{
                  color: /[A-Z]/.test(password) ? "#16a34a" : "#dc2626",
                  marginBottom: 5,
                }}
              >
                {/[A-Z]/.test(password) ? "✓" : "✕"} One uppercase letter
              </div>

              <div
                style={{
                  color: /[a-z]/.test(password) ? "#16a34a" : "#dc2626",
                  marginBottom: 5,
                }}
              >
                {/[a-z]/.test(password) ? "✓" : "✕"} One lowercase letter
              </div>

              <div
                style={{
                  color: /[^A-Za-z0-9]/.test(password) ? "#16a34a" : "#dc2626",
                }}
              >
                {/[^A-Za-z0-9]/.test(password) ? "✓" : "✕"} One special
                character
              </div>
            </div>

            {/* CONFIRM PASSWORD */}

            <FormField
              label="Re-enter Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />

            {confirmPassword.length > 0 && (
              <div
                style={{
                  marginTop: -8,
                  color: password === confirmPassword ? "#16a34a" : "#dc2626",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {password === confirmPassword
                  ? "✓ Passwords match"
                  : "✕ Passwords do not match"}
              </div>
            )}

            {/* RESET PASSWORD */}

            <button
              type="submit"
              className="btn btn--primary"
              disabled={
                submitting ||
                !password ||
                !confirmPassword ||
                password !== confirmPassword
              }
            >
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
