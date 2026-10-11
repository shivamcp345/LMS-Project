import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getMyEnrollments } from "../api/enrollments";
import { getMyBatches } from "../api/batches";
import { getLessonsByBatch } from "../api/lessons";

const TYPES = [
  "All",
  "Documents",
  "Links",
  "Notes",
  "Assignments",
  "Recordings",
];
function typeFor(lesson) {
  return lesson.materialType === "document"
    ? "Documents"
    : lesson.materialType === "link"
      ? "Links"
      : lesson.materialType === "note"
        ? "Notes"
        : lesson.materialType === "assignment"
          ? "Assignments"
          : "Recordings";
}
function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [favourites, setFavourites] = useState(() => new Set());
  const [showFavourites, setShowFavourites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [enrollmentResponse, batchResponse] = await Promise.all([
        getMyEnrollments(),
        getMyBatches(),
      ]);
      setEnrollments(
        Array.isArray(enrollmentResponse.data) ? enrollmentResponse.data : [],
      );
      const batches = Array.isArray(batchResponse.data)
        ? batchResponse.data
        : [];
      const lessonResults = await Promise.all(
        batches.map(async (batch) => {
          try {
            const response = await getLessonsByBatch(batch._id);
            return (response.data || []).map((lesson) => ({
              ...lesson,
              batchName: batch.batchName,
              batchId: batch._id,
              instructor: batch.trainer?.name || "Trainer",
            }));
          } catch {
            return [];
          }
        }),
      );
      setMaterials(lessonResults.flat());
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load your learning library.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TYPES.map((type) => [
          type,
          type === "All"
            ? materials.length
            : materials.filter((item) => typeFor(item) === type).length,
        ]),
      ),
    [materials],
  );
  const visible = materials.filter((item) => {
    const typeOk = filter === "All" || typeFor(item) === filter;
    const q = search.toLowerCase().trim();
    const searchOk =
      !q ||
      item.title?.toLowerCase().includes(q) ||
      item.batchName?.toLowerCase().includes(q);
    const favOk = !showFavourites || favourites.has(item._id);
    return typeOk && searchOk && favOk;
  });
  const courseProgress = enrollments
    .map((enrollment) => ({ ...enrollment, course: enrollment.course }))
    .filter((item) => item.course);

  return (
    <AppShell>
      <main className="page study-materials-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">MY LEARNING</span>
            <h1>Study Materials</h1>
            <p>Your documents, links, recordings & assignments.</p>
          </div>
        </div>
        {error && <div className="banner banner--error">{error}</div>}
        {loading ? (
          <div className="card card__pad empty-state">
            Loading your learning library…
          </div>
        ) : (
          <>
            <div className="material-summary-grid">
              {[
                ["Documents", "▱", "Documents"],
                ["Links", "↗", "Links"],
                ["Notes", "✎", "Notes"],
                ["Assignments", "☑", "Assignments"],
                ["Recordings", "▷", "Recordings"],
              ].map(([label, icon, key]) => (
                <button
                  type="button"
                  className={`material-summary-card material-summary-card--${label.toLowerCase()}`}
                  key={label}
                  onClick={() => setFilter(key)}
                >
                  <span className="material-summary-icon">{icon}</span>
                  <strong>{label}</strong>
                  <b>{counts[key]}</b>
                </button>
              ))}
            </div>
            <div className="material-filters">
              {TYPES.map((type) => (
                <button
                  type="button"
                  className={filter === type ? "is-active" : ""}
                  key={type}
                  onClick={() => setFilter(type)}
                >
                  {type} <span>{counts[type]}</span>
                </button>
              ))}
            </div>
            <div className="material-toolbar card">
              <div className="search-box">
                ⌕
                <input
                  placeholder="Search study materials"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`chip ${showFavourites ? "chip--primary" : ""}`}
                onClick={() => setShowFavourites((value) => !value)}
              >
                ☆ Favourites
              </button>
            </div>
            <div className="material-content-grid">
              <section>
                <div className="material-list material-list--large">
                  {visible.length ? (
                    visible.map((item) => {
                      const type = typeFor(item);
                      const fav = favourites.has(item._id);
                      return (
                        <article className="study-material-item" key={item._id}>
                          <button
                            type="button"
                            className={`material-favourite ${fav ? "is-active" : ""}`}
                            onClick={() =>
                              setFavourites((current) => {
                                const next = new Set(current);
                                if (next.has(item._id)) next.delete(item._id);
                                else next.add(item._id);
                                return next;
                              })
                            }
                          >
                            ☆
                          </button>
                          <div className="study-material-thumb">
                            {type === "Recordings"
                              ? "▷"
                              : type === "Documents"
                                ? "▱"
                                : "✎"}
                          </div>
                          <div className="study-material-copy">
                            <h3>{item.title}</h3>
                            <p>
                              {item.instructor} · {formatDate(item.createdAt)}
                            </p>
                            <small>{item.description || type}</small>
                          </div>
                          <Link
                            className="hero-btn"
                            to={`/my-batch/${item.batchId}/lessons/${item._id}`}
                          >
                            {type === "Recordings" ? "Watch" : "Open"} →
                          </Link>
                        </article>
                      );
                    })
                  ) : (
                    <div className="card card__pad empty-state">
                      No materials match the current filter.
                    </div>
                  )}
                </div>
              </section>
              <aside className="my-learning-courses">
                <div className="section-heading">
                  <div>
                    <h2>My Courses</h2>
                    <p>{courseProgress.length} enrolled</p>
                  </div>
                </div>
                {courseProgress.length ? (
                  courseProgress.map((item) => (
                    <Link
                      className="my-course-mini"
                      key={item._id}
                      to={`/learn/${item.course._id}`}
                    >
                      <strong>{item.course.title}</strong>
                      <span>{item.progress || 0}% complete</span>
                      <div className="progress">
                        <i style={{ width: `${item.progress || 0}%` }} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="empty-state">
                    No enrolled courses yet.{" "}
                    <Link to="/courses">Browse courses →</Link>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
