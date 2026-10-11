import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { Link } from "react-router-dom";
import { getAdminStats } from "../api/enrollments";
import { useAuth } from "../context/AuthContext";

const WEEKS_PER_PAGE = 13;

function getDefaultWeeklyPage(year) {
  const now = new Date();
  if (year > now.getUTCFullYear()) return 0;
  if (year < now.getUTCFullYear()) return Math.ceil(53 / WEEKS_PER_PAGE) - 1;

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const firstDay = yearStart.getUTCDay() || 7;
  const firstWeekStart = new Date(yearStart);
  firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - firstDay + 1);
  const currentWeek = Math.floor(
    (now.getTime() - firstWeekStart.getTime()) / 604800000,
  );
  return Math.floor(Math.max(0, currentWeek) / WEEKS_PER_PAGE);
}

function DashboardIcon({ name }) {
  const icons = {
    students: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    trainers: (
      <>
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11.2v4.3c2.8 2.3 7.2 2.3 10 0v-4.3M21 9v6" />
      </>
    ),
    enrollments: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        <path d="M8 7h8M8 11h8" />
      </>
    ),
    revenue: (
      <text
        x="12"
        y="18"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
        fontSize="17"
        fontWeight="700"
      >
        ₹
      </text>
    ),
    courses: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    batches: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
}

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AdminDashboard() {
  const { user: userDetails } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [weeklyPage, setWeeklyPage] = useState(() =>
    getDefaultWeeklyPage(new Date().getFullYear()),
  );

  useEffect(() => {
    let isCurrentRequest = true;

    getAdminStats({ period, year })
      .then((response) => {
        if (isCurrentRequest) {
          setStats(response.data);
          setError("");
        }
      })
      .catch((err) => {
        if (isCurrentRequest) {
          setError(
            err.response?.data?.message || "Failed to load dashboard stats",
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [period, year]);

  const trend = stats?.newStudentsTrend || [];
  const weeklyPageCount = Math.max(1, Math.ceil(trend.length / WEEKS_PER_PAGE));
  const currentWeeklyPage = Math.min(weeklyPage, weeklyPageCount - 1);
  const visibleTrend =
    period === "weekly"
      ? trend.slice(
          currentWeeklyPage * WEEKS_PER_PAGE,
          (currentWeeklyPage + 1) * WEEKS_PER_PAGE,
        )
      : trend;
  const admissionsCount = visibleTrend.reduce(
    (total, point) => total + point.count,
    0,
  );
  const firstWeek = currentWeeklyPage * WEEKS_PER_PAGE + 1;
  const lastWeek = Math.min(
    (currentWeeklyPage + 1) * WEEKS_PER_PAGE,
    trend.length,
  );

  function changePeriod(nextPeriod) {
    if (nextPeriod === period) return;
    setPeriod(nextPeriod);
    setWeeklyPage(getDefaultWeeklyPage(year));
    setLoading(true);
  }

  function changeYear(nextYear) {
    if (nextYear === year) return;
    setYear(nextYear);
    setWeeklyPage(getDefaultWeeklyPage(nextYear));
    setLoading(true);
  }

  return (
    <AppShell>
      <main className="page staff-page admin-dashboard">
        <section className="hero-card admin-hero">
          <div className="admin-hero__content">
            <span className="eyebrow hero-eyebrow">ADMIN CONTROL CENTER</span>
            <h1>Good to see you, {userDetails?.name || "Admin"}</h1>
            <p>Here's what's happening across your learning platform.</p>
            <Link className="admin-hero__action" to="/admin/users">
              Manage students <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="hero-art">
            <div className="hero-book">
              <DashboardIcon name="trainers" />
            </div>
          </div>
        </section>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="stat-grid stat-grid--modern">
          {[
            {
              label: "Total students",
              value: stats?.totalStudents ?? 0,
              icon: "students",
              tone: "violet",
            },
            {
              label: "Active trainers",
              value: stats?.totalTrainers ?? 0,
              icon: "trainers",
              tone: "blue",
            },
            {
              label: "Active enrollments",
              value: stats?.activeEnrollments ?? 0,
              icon: "enrollments",
              tone: "green",
            },
            {
              label: "Total revenue",
              value: `₹${(stats?.revenue ?? 0).toLocaleString("en-IN")}`,
              icon: "revenue",
              tone: "amber",
            },
          ].map((metric) => (
            <div className="metric" key={metric.label}>
              <span className={`metric__icon metric__icon--${metric.tone}`}>
                <DashboardIcon name={metric.icon} />
              </span>
              <div className="metric__copy">
                <strong>{loading ? "…" : metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            </div>
          ))}
        </div>

        <section className="card card__pad dashboard-chart">
          <div className="section-head">
            <div className="admin-dashboard__section-copy">
              <span className="eyebrow">ENROLLMENT ANALYTICS</span>
              <h2>Student admissions</h2>
              <p>Track new student admissions across your platform.</p>
            </div>
            <div className="dashboard-chart-controls">
              <div
                className="admission-period-switch"
                role="group"
                aria-label="Admission period"
              >
                {["weekly", "monthly", "yearly"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={period === option ? "is-active" : ""}
                    aria-pressed={period === option}
                    onClick={() => changePeriod(option)}
                  >
                    {option[0].toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
              <label className="chart-year-control">
                <span>Year</span>
                <select
                  className="form-input chart-select"
                  value={year}
                  onChange={(e) => changeYear(Number(e.target.value))}
                  aria-label="Admission year"
                >
                  {Array.from(
                    { length: 7 },
                    (_, i) => new Date().getFullYear() - i,
                  ).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="admission-chart-summary">
            <span className="dashboard-chart__total">
              {loading ? "…" : admissionsCount} admissions
            </span>
            {period === "weekly" ? (
              <div className="admission-chart-pager">
                <button
                  type="button"
                  onClick={() => setWeeklyPage(currentWeeklyPage - 1)}
                  disabled={currentWeeklyPage === 0 || loading}
                  aria-label="Show previous weeks"
                >
                  ←
                </button>
                <span aria-live="polite">
                  Weeks {firstWeek}–{lastWeek} of {trend.length || 53}
                </span>
                <button
                  type="button"
                  onClick={() => setWeeklyPage(currentWeeklyPage + 1)}
                  disabled={currentWeeklyPage >= weeklyPageCount - 1 || loading}
                  aria-label="Show next weeks"
                >
                  →
                </button>
              </div>
            ) : (
              <span className="admission-chart-period">
                {period === "monthly" ? "Monthly totals" : "Yearly totals"} ·{" "}
                {year}
              </span>
            )}
          </div>
          {loading ? (
            <div className="empty-state">Loading admission data…</div>
          ) : (
            <div className="admission-chart-scroll">
              <div
                className={`admission-chart admission-chart--${period}`}
                role="img"
                aria-label={`${period} student admissions for ${year}`}
              >
                {visibleTrend.map((point) => {
                  const max = Math.max(
                    1,
                    ...visibleTrend.map((item) => item.count),
                  );
                  const height = Math.round((point.count / max) * 100);
                  return (
                    <div className="admission-chart__item" key={point.label}>
                      <span className="admission-chart__value">
                        {point.count}
                      </span>
                      <div className="admission-chart__track">
                        <div
                          className={`admission-chart__bar ${point.count === 0 ? "is-empty" : ""}`}
                          style={{ height: `${height}%` }}
                          title={`${point.count} admissions in ${point.label}`}
                        />
                      </div>
                      <span className="admission-chart__month">
                        {point.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="admin-grid">
          <section className="card card__pad">
            <div className="section-head">
              <div>
                <h2>Recent activity</h2>
                <p>Latest platform events</p>
              </div>
              <Link to="/admin/users">View users →</Link>
            </div>

            {loading ? (
              <div className="empty-state">Loading activity…</div>
            ) : !stats?.recentActivity?.length ? (
              <div className="empty-state">No recent activity yet.</div>
            ) : (
              stats.recentActivity.map((activity, i) => (
                <div className="activity" key={i}>
                  <span className="activity__icon" aria-hidden="true">
                    <DashboardIcon name="enrollments" />
                  </span>
                  <div>
                    <strong>{activity.message}</strong>
                    <small>{timeAgo(activity.date)}</small>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="card card__pad">
            <div className="section-head">
              <div>
                <h2>Quick actions</h2>
              </div>
            </div>
            <div className="quick-actions">
              <Link to="/admin/courses">
                <span className="quick-action__icon">
                  <DashboardIcon name="courses" />
                </span>
                <span>Add course</span>
                <span className="quick-action__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <Link to="/admin/batches">
                <span className="quick-action__icon">
                  <DashboardIcon name="batches" />
                </span>
                <span>Manage batches</span>
                <span className="quick-action__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <Link to="/admin/users">
                <span className="quick-action__icon">
                  <DashboardIcon name="students" />
                </span>
                <span>Manage students</span>
                <span className="quick-action__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <Link to="/admin/trainers">
                <span className="quick-action__icon">
                  <DashboardIcon name="trainers" />
                </span>
                <span>Manage trainers</span>
                <span className="quick-action__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
