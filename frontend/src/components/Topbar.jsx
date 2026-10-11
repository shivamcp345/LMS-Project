import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Topbar({ setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = (user?.name || user?.email || "?")
    .trim()
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const titles = {
    dashboard: "Dashboard",
    courses: "Explore courses",
    "my-courses": "My learning",
    "my-batch": "My batch",
    profile: "Profile",
    "admin/dashboard": "Admin dashboard",
    "admin/courses": "Manage courses",
    "admin/batches": "Manage batches",
    "admin/users": "Manage users",
    "admin/profile": "Admin profile",
    "trainer/dashboard": "Trainer dashboard",
  };

  const roleLabels = {
    admin: "Administrator",
    trainer: "Trainer",
    user: "Student",
  };
  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "trainer"
        ? "/trainer/dashboard"
        : "/dashboard";

  const title =
    Object.entries(titles).find(([key]) =>
      location.pathname.includes(`/${key}`),
    )?.[1] || "Learnly";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="topbar">
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      <Link
        to={dashboardPath}
        className="topbar__mobile-brand"
        aria-label="Go to dashboard"
      >
        <span className="logo__mark">L</span>
        Learnly
      </Link>

      <div className="topbar__title">{title}</div>

      <div className="topbar__actions">
        <div className="topbar__user">
          <div className="avatar">{initials}</div>

          <div className="topbar__user-copy">
            <strong>{user?.name || "Learner"}</strong>
            <span>{roleLabels[user?.role] || "Student"}</span>
          </div>
        </div>

        <ThemeToggle />

        <button className="logout-btn" onClick={handleLogout}>
          ↪
        </button>
      </div>
    </header>
  );
}
