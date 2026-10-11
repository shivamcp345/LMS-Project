import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const userItems = [
  ["dashboard", "Dashboard", "⌂"],
  ["courses", "Explore courses", "▣"],
  ["my-batch", "My batch", "☷"],
  ["profile", "Profile", "◎"],
];

const adminItems = [
  ["admin/dashboard", "Dashboard", "⌂"],
  ["admin/courses", "Manage courses", "▣"],
  ["admin/users", "Manage students", "♙"],
  ["admin/batches", "Manage batches", "☷"],
  ["admin/trainers", "Manage trainers", "♙"],
  ["admin/profile", "Profile", "◎"],
];

const trainerItems = [
  ["trainer/dashboard", "Dashboard", "⌂"],
  ["trainer/batches", "My batches", "☷"],
  ["trainer/students", "Students", "♙"],
  ["profile", "Profile", "◎"],
];

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items =
    user?.role === "admin"
      ? adminItems
      : user?.role === "trainer"
        ? trainerItems
        : userItems;

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
    navigate("/login");
  }

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${mobileMenuOpen ? "sidebar--mobile-open" : ""}`}
      >
        <div className="sidebar-mobile-close">
          <button type="button" onClick={() => setMobileMenuOpen(false)}>
            ✕
          </button>
        </div>

        <Logo />

        <div className="sidebar__label">
          {user?.role === "admin"
            ? "Administration"
            : user?.role === "trainer"
              ? "Teaching space"
              : "Learning space"}
        </div>

        <nav className="sidebar__nav">
          {items.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={`/${to}`}
              className="side-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="side-link__icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <span className="side-link__icon">↪</span>
            <span>Logout</span>
          </button>

          <div className="sidebar-tip">
            <strong>Keep learning.</strong>
            <span>Small progress adds up.</span>
          </div>
        </div>
      </aside>
    </>
  );
}
