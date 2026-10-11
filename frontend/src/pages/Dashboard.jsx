import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Video,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { getMyBatches } from "../api/batches";
import { getBatchMaterials } from "../api/materials";
import { getMyTestResults } from "../api/tests";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayKey = WEEKDAYS[new Date().getDay()];

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const [batchResponse, attemptResponse] = await Promise.all([
        getMyBatches(),
        getMyTestResults(),
      ]);
      const enrolledBatches = batchResponse.data || [];
      setBatches(enrolledBatches);
      setAttempts(attemptResponse.data || []);

      const materialResults = await Promise.allSettled(
        enrolledBatches.map((batch) => getBatchMaterials(batch._id)),
      );
      setMaterials(
        materialResults.flatMap((result, index) =>
          result.status === "fulfilled"
            ? (result.value.data || []).map((material) => ({
                ...material,
                batchId: enrolledBatches[index]._id,
                batchName: enrolledBatches[index].batchName,
              }))
            : [],
        ),
      );
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "Could not load your learning dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const todaysClasses = batches
    .filter((batch) => batch.status === "Active")
    .flatMap((batch) =>
      (batch.schedule || [])
        .filter((slot) => slot.dayOfWeek === todayKey)
        .map((slot) => ({ ...slot, batchId: batch._id, batchName: batch.batchName })),
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recentAttempts = attempts.slice(0, 5);
  const recentMaterials = materials.slice(0, 4);

  return (
    <AppShell>
      <main className="page student-dashboard student-dashboard--overview">
        <section className="hero-card">
          <div>
            <span className="eyebrow hero-eyebrow">YOUR LEARNING SPACE</span>
            <h1>Hey {user?.name?.split(" ")[0] || "Learner"} 👋</h1>
            <p>Ready to turn a little learning into a lot of progress?</p>
            <Link className="hero-btn" to="/courses">
              Explore courses <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orb orb--one" />
            <div className="orb orb--two" />
            <div className="hero-book">▣</div>
          </div>
        </section>

        {error && (
          <div className="banner banner--error dashboard-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadDashboard}>Try again</button>
          </div>
        )}

        <div className="student-dashboard__layout" aria-busy={loading}>
          <div className="student-dashboard__main">
            <div className="student-dashboard__top-grid">
          <section className="card dashboard-panel">
            <header className="dashboard-panel__header">
              <div>
                <span className="dashboard-panel__eyebrow">YOUR CLASSES</span>
                <h2><Layers3 size={18} aria-hidden="true" /> My batches</h2>
              </div>
              <Link to="/my-batch">View all <ArrowRight size={15} aria-hidden="true" /></Link>
            </header>
            {loading ? (
              <div className="dashboard-panel__loading">Loading batches…</div>
            ) : batches.length ? (
              <div className="dashboard-panel__list">
                {batches.slice(0, 4).map((batch) => (
                  <Link className="dashboard-batch-row" key={batch._id} to={`/my-batch/${batch._id}`}>
                    <span className="dashboard-row-icon"><Layers3 size={17} aria-hidden="true" /></span>
                    <span className="dashboard-row-copy">
                      <strong>{batch.batchName}</strong>
                      <small>{batch.course?.title || "Course"} · Enrolled {formatDate(batch.joinedAt)}</small>
                    </span>
                    <span className={`dashboard-status ${batch.status === "Active" ? "is-active" : ""}`}>{batch.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-panel__empty">No batches assigned yet.</div>
            )}
          </section>

          <section className="card dashboard-panel">
            <header className="dashboard-panel__header">
              <div>
                <span className="dashboard-panel__eyebrow">KEEP LEARNING</span>
                <h2><BookOpen size={18} aria-hidden="true" /> Study materials</h2>
              </div>
              <Link to="/my-batch">Browse batches <ArrowRight size={15} aria-hidden="true" /></Link>
            </header>
            {loading ? (
              <div className="dashboard-panel__loading">Loading materials…</div>
            ) : recentMaterials.length ? (
              <div className="dashboard-panel__list">
                {recentMaterials.map((material) => (
                  <Link
                    className="dashboard-material-row"
                    key={`${material.batchId}-${material._id}`}
                    to={`/my-batch/${material.batchId}#study-material`}
                  >
                    <span className="dashboard-row-icon dashboard-row-icon--blue"><FileText size={17} aria-hidden="true" /></span>
                    <span className="dashboard-row-copy">
                      <strong>{material.title}</strong>
                      <small>{material.batchName}{material.materialType ? ` · ${material.materialType}` : ""}</small>
                    </span>
                    <ArrowRight className="dashboard-row-arrow" size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-panel__empty">No study materials shared yet.</div>
            )}
          </section>
            </div>

        <section className="card dashboard-panel dashboard-panel--wide">
          <header className="dashboard-panel__header">
            <div>
              <span className="dashboard-panel__eyebrow">ASSESSMENTS</span>
              <h2><CheckCircle2 size={18} aria-hidden="true" /> Test attempts</h2>
            </div>
            <Link to="/my-batch">View batch tests <ArrowRight size={15} aria-hidden="true" /></Link>
          </header>
          {loading ? (
            <div className="dashboard-panel__loading">Loading test attempts…</div>
          ) : recentAttempts.length ? (
            <div className="dashboard-attempt-list">
              {recentAttempts.map((attempt) => {
                const test = attempt.test || {};
                const batch = test.batch || {};
                return (
                  <article className="dashboard-attempt-row" key={attempt._id}>
                    <span className="dashboard-row-icon dashboard-row-icon--green"><CheckCircle2 size={17} aria-hidden="true" /></span>
                    <span className="dashboard-row-copy">
                      <strong>{test.title || "Test"}</strong>
                      <small>{batch.batchName || "Batch"} · {formatDate(attempt.updatedAt || attempt.createdAt)}</small>
                    </span>
                    <span className={`dashboard-attempt-score ${attempt.isGraded ? "is-graded" : "is-pending"}`}>
                      {attempt.isGraded ? `${attempt.score}/${attempt.total} · ${attempt.percentage ?? 0}%` : "Awaiting review"}
                    </span>
                    {batch._id && (
                      <Link className="dashboard-row-link" to={`/my-batch/${batch._id}/tests`} aria-label={`Open ${test.title || "test"}`}>
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-panel__empty">Your test attempts and results will appear here.</div>
          )}
            </section>
          </div>

          <aside className="student-dashboard__aside">
            <section className="card dashboard-panel dashboard-panel--timetable">
          <header className="dashboard-panel__header">
            <div>
              <span className="dashboard-panel__eyebrow">{todayKey.toUpperCase()}</span>
              <h2><CalendarDays size={18} aria-hidden="true" /> Today’s timetable</h2>
            </div>
            <span className="dashboard-panel__today"><Clock3 size={14} aria-hidden="true" /> {todaysClasses.length} {todaysClasses.length === 1 ? "class" : "classes"}</span>
          </header>
          {loading ? (
            <div className="dashboard-panel__loading">Loading today’s timetable…</div>
          ) : todaysClasses.length ? (
            <div className="dashboard-timetable-list">
              {todaysClasses.map((slot) => (
                <article className="dashboard-timetable-row" key={slot._id || `${slot.batchId}-${slot.startTime}`}>
                  <span className="dashboard-timetable-time"><Clock3 size={15} aria-hidden="true" /> {slot.startTime}–{slot.endTime}</span>
                  <span className="dashboard-row-copy">
                    <strong>{slot.batchName}</strong>
                    <small>Today · {todayKey}</small>
                  </span>
                  {slot.meetLink ? (
                    <a className="dashboard-join-link" href={slot.meetLink} target="_blank" rel="noreferrer"><Video size={15} aria-hidden="true" /> Join class</a>
                  ) : (
                    <Link className="dashboard-row-link" to={`/my-batch/${slot.batchId}`} aria-label={`View ${slot.batchName}`}><ArrowRight size={16} aria-hidden="true" /></Link>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-panel__empty">No classes scheduled for today. Enjoy the time to catch up on your learning.</div>
          )}
            </section>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
