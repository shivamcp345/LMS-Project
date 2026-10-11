import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarCheck2,
  FolderOpen,
  MoreVertical,
  UsersRound,
  Video,
} from "lucide-react";
import AppShell from "../components/AppShell";
import AttendanceCalendar from "../components/AttendanceCalendar";
import {
  getMyBatches,
  getBatchmates,
  getMyBatchAttendance,
} from "../api/batches";
import { getBatchMaterials } from "../api/materials";
import { getBatchTests } from "../api/tests";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function MyBatch() {
  const { batchId } = useParams();
  const [batches, setBatches] = useState([]);
  const [mates, setMates] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [testCount, setTestCount] = useState(0);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const response = await getMyBatches();
        const list = response.data || [];
        setBatches(list);
        if (!batchId) return;
        if (!list.some((item) => item._id === batchId))
          throw new Error("You are not enrolled in this batch.");
        const results = await Promise.allSettled([
          getBatchmates(batchId),
          getMyBatchAttendance(batchId),
          getBatchMaterials(batchId),
          getBatchTests(batchId),
        ]);
        setMates(
          results[0].status === "fulfilled" ? results[0].value.data || [] : [],
        );
        setAttendance(
          results[1].status === "fulfilled" ? results[1].value.data || [] : [],
        );
        setMaterials(
          results[2].status === "fulfilled" ? results[2].value.data || [] : [],
        );
        setTestCount(
          results[3].status === "fulfilled"
            ? results[3].value.data?.length || 0
            : 0,
        );
      } catch (loadError) {
        setError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Could not load your batches.",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  if (loading)
    return (
      <AppShell>
        <main className="page">
          <div className="card card__pad empty-state">
            Loading your batches…
          </div>
        </main>
      </AppShell>
    );
  if (error)
    return (
      <AppShell>
        <main className="page">
          <div className="banner banner--error">{error}</div>
        </main>
      </AppShell>
    );

  if (!batchId) {
    const filtered = batches.filter((batch) =>
      `${batch.batchName} ${batch.trainer?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    return (
      <AppShell>
        <main className="page my-batches-page">
          <header className="my-batches-hero card">
            <div>
              <span className="eyebrow">MY BATCHES</span>
              <h1>
                My Batches{" "}
                <span className="count-badge">{batches.length} enrolled</span>
              </h1>
              <p>Track and manage your batch journey.</p>
            </div>
            <div className="batch-summary-metrics">
              <span>
                <b>
                  {batches.filter((batch) => batch.status === "Active").length}
                </b>
                <small>Active Batches</small>
              </span>
              <span>
                <b>{batches.length}</b>
                <small>Total Batches</small>
              </span>
            </div>
          </header>
          {!batches.length ? (
            <div className="card card__pad empty-state">
              You are not assigned to a batch yet.
            </div>
          ) : (
            <section className="my-batch-table card">
              <div className="my-batch-table__heading">
                <strong>
                  Batch List{" "}
                  <span className="count-badge">{batches.length}</span>
                </strong>
                <input
                  aria-label="Search batches"
                  placeholder="Search batches"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Status</th>
                      <th>Instructor</th>
                      <th>Start date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((batch) => (
                      <tr key={batch._id}>
                        <td>
                          <strong>{batch.batchName}</strong>
                          <small>
                            {batch.course?.title || batch.batchName}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`pill ${batch.status === "Completed" ? "pill--yellow" : "pill--green"}`}
                          >
                            {batch.status}
                          </span>
                        </td>
                        <td>{batch.trainer?.name || "Not assigned"}</td>
                        <td>{formatDate(batch.startDate)}</td>
                        <td>
                          <Link className="chip" to={`/my-batch/${batch._id}`}>
                            View Details ›
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </AppShell>
    );
  }

  const batch = batches.find((item) => item._id === batchId);
  const liveSlot = batch?.schedule?.find((slot) => slot.meetLink);
  return (
    <AppShell>
      <main className="page batch-details-page">
        <Link className="back-link" to="/my-batch">
          ← Back to my batches
        </Link>
        <section className="batch-detail-hero card">
          <Link
            className="batch-back-button"
            to="/my-batch"
            aria-label="Back to batches"
          >
            ‹
          </Link>
          <div>
            <span className="eyebrow">BATCH</span>
            <div className="batch-detail-title">
              <h1>{batch.batchName}</h1>
              <span
                className={`pill ${batch.status === "Completed" ? "pill--yellow" : "pill--green"}`}
              >
                {batch.status}
              </span>
              <span className="batch-course-tag">
                {batch.course?.title || "Course"}
              </span>
            </div>
            <p>
              Instructor:{" "}
              <strong>{batch.trainer?.name || "Not assigned"}</strong>
            </p>
          </div>
          <div className="batch-detail-hero__meta">
            <span>
              Start Date<strong>{formatDate(batch.startDate)}</strong>
            </span>
            <button
              className="hero-btn"
              type="button"
              aria-expanded={quickActionsOpen}
              onClick={() => setQuickActionsOpen((open) => !open)}
            >
              <MoreVertical size={17} aria-hidden="true" /> Quick Actions{" "}
              <span>{quickActionsOpen ? "⌄" : "›"}</span>
            </button>
          </div>
        </section>
        {quickActionsOpen && (
          <nav
            className="batch-quick-actions-menu"
            aria-label="Batch quick actions"
          >
            <a href="#live-class" onClick={() => setQuickActionsOpen(false)}>
              <Video size={21} aria-hidden="true" />
              <span>
                <strong>Live Class</strong>
                <small>Join live class</small>
              </span>
            </a>
            <a href="#classmates" onClick={() => setQuickActionsOpen(false)}>
              <UsersRound size={21} aria-hidden="true" />
              <span>
                <strong>Classmates</strong>
                <small>{mates.length} students</small>
              </span>
            </a>
            <a href="#attendance" onClick={() => setQuickActionsOpen(false)}>
              <CalendarCheck2 size={21} aria-hidden="true" />
              <span>
                <strong>Attendance</strong>
                <small>View attendance</small>
              </span>
            </a>
            <a
              href="#study-material"
              onClick={() => setQuickActionsOpen(false)}
            >
              <FolderOpen size={21} aria-hidden="true" />
              <span>
                <strong>Study Material</strong>
                <small>{materials.length} materials</small>
              </span>
            </a>
          </nav>
        )}
        <section className="batch-live-banner" id="live-class">
          <div>
            <strong>Live Class</strong>
            <span>
              {liveSlot
                ? `${liveSlot.dayOfWeek} · ${liveSlot.startTime}–${liveSlot.endTime}`
                : "No live class link added yet"}
            </span>
          </div>
          {liveSlot?.meetLink && (
            <a
              className="hero-btn"
              href={liveSlot.meetLink}
              target="_blank"
              rel="noreferrer"
            >
              Join Live <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
        </section>
        <div className="batch-detail-two-col">
          <section className="batch-detail-card" id="study-material">
            <div className="section-heading">
              <div>
                <h2>
                  Study Material{" "}
                  <span className="count-badge">{materials.length}</span>
                </h2>
                <p>Recordings and resources shared for this batch.</p>
              </div>
            </div>
            {materials.length ? (
              <div className="material-list">
                {materials.slice(0, 8).map((material) => (
                  <article className="material-row" key={material._id}>
                    <span className="material-icon">▷</span>
                    <div>
                      <strong>{material.title}</strong>
                      <small>
                        {material.materialType || "Material"} ·{" "}
                        {formatDate(material.createdAt)}
                      </small>
                    </div>
                    {material.videoUrl && (
                      <a
                        className="chip"
                        href={material.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Watch ›
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No study material has been added yet.
              </div>
            )}
          </section>
          <Link
            className="batch-detail-card batch-test-summary"
            to={`/my-batch/${batch._id}/tests`}
          >
            <div className="section-heading">
              <div>
                <h2>
                  Tests <span className="count-badge">{testCount}</span>
                </h2>
                <p>Tests mapped to this batch.</p>
              </div>
            </div>
            {testCount ? (
              <span>View and attempt tests ›</span>
            ) : (
              <div className="empty-state">No tests mapped to this batch.</div>
            )}
          </Link>
        </div>
        <section
          className="batch-detail-card batch-attendance-section"
          id="attendance"
        >
          <div className="section-heading">
            <div>
              <h2>Attendance</h2>
              <p>Your attendance from the day you joined this batch.</p>
            </div>
          </div>
          <AttendanceCalendar records={attendance} joinedAt={batch.joinedAt} />
        </section>
        <section
          className="batch-detail-card batch-classmates-section"
          id="classmates"
        >
          <div className="section-heading">
            <div>
              <h2>
                Classmates <span className="count-badge">{mates.length}</span>
              </h2>
              <p>Students in this batch.</p>
            </div>
          </div>
          {mates.length ? (
            <div className="batchmates-detail-grid">
              {mates.map((mate) => (
                <article className="batchmate-detail-card" key={mate._id}>
                  <div className="mini-avatar">
                    {(mate.name || "U")[0].toUpperCase()}
                  </div>
                  <strong>{mate.name}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No classmates in this batch yet.</div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
