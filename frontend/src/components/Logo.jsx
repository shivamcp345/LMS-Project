import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Logo({ dark = false }) {
  const { user } = useAuth();
  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "trainer"
        ? "/trainer/dashboard"
        : "/dashboard";

  return (
    <Link
      to={dashboardPath}
      className={`logo ${dark ? "logo--dark" : ""}`}
      aria-label="Go to dashboard"
    >
      <span className="logo__mark">L</span>
      <span>Learnly</span>
    </Link>
  );
}
