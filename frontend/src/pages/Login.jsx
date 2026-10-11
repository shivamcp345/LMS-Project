import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import { loginUser, loginWithGoogle } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function redirectAfterLogin(data) {
    login(data);

    const userRole = data.data?.user?.role;
    navigate(
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "trainer"
          ? "/trainer/dashboard"
          : "/dashboard",
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const data = await loginUser({ email, password });

      redirectAfterLogin(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not sign in. Check your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess({ credential }) {
    setError("");
    setSubmitting(true);

    try {
      const data = await loginWithGoogle(credential);
      redirectAfterLogin(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not sign in with Google. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Pick up right where you left off."
      title="Log in"
      subtitle="Welcome back — enter your details to continue."
      footer={
        <>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {error && <div className="banner banner--error">{error}</div>}

        {/* Email */}
        <FormField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        {/* Password */}
        <div className="login-password-field">
          <FormField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="login-forgot-password">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </div>

        {/* Login Button */}
        <button
          className="btn btn--primary"
          type="submit"
          disabled={submitting}
        >
          {submitting && <span className="spinner" />}
          {submitting ? "Signing in…" : "Log in"}
        </button>

        {googleClientId && (
          <>
            <div className="auth-divider">
              <span>or continue with</span>
            </div>
            <div className="google-login">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError("Could not sign in with Google. Please try again.")
                }
                useOneTap={false}
                theme="outline"
                size="large"
                width="390"
              />
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
