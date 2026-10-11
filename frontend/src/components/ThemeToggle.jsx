import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }) {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("lms_theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("lms_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={() => setDarkMode((enabled) => !enabled)}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Light mode" : "Dark mode"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {darkMode ? "☼" : "◐"}
      </span>
    </button>
  );
}
