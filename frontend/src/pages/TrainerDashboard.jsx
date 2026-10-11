import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Layers3, UsersRound } from "lucide-react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { getTrainerBatches } from "../api/batches";

function dateLabel(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "â€”";
}

export default function TrainerDashboard({ batchOnly = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getTrainerBatches()
      .then((response) => setBatches(response.data || []))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Failed to load assigned batches",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = batches.reduce(
    (sum, batch) => sum + (batch.studentCount || 0),
    0,
  );

  return (
    <AppShell>
      <main className="page staff-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">TEACHING SPACE</span>
            <h1>{batchOnly ? "Assigned batches" : "Trainer dashboard"}</h1>
            <p>
              {batchOnly
                ? "Your assigned batches and students."
                : "Review your teaching batches and students."}
            </p>
          </div>
        </div>
        {!batchOnly && (
          <section className="trainer-welcome card">
            <span className="eyebrow">YOUR TEACHING SPACE</span>
            <h2>Welcome back, {user?.name?.split(" ")[0] || "Trainer"}!</h2>
            <p>Your assigned batches and students are ready to review.</p>
          </section>
        )}
        {error && <div className="banner banner--error">{error}</div>}
        {loading ? (
          <div className="card card__pad empty-state">
            Loading your batches
          </div>
        ) : !batches.length ? (
          <div className="card card__pad empty-state">
            No batches have been assigned to you yet.
          </div>
        ) : (
          <>
            {!batchOnly && (
              <div className="trainer-metrics">
                <button
                  type="button"
                  className="trainer-metric trainer-metric--button"
                  onClick={() => navigate("/trainer/batches")}
                >
                  <span className="trainer-metric__label">
                    <Layers3 size={17} aria-hidden="true" /> Assigned batches
                  </span>
                  <strong>{batches.length}</strong>
                  <span className="trainer-metric__hint">
                    Your current teaching load
                  </span>
                </button>
                <button
                  type="button"
                  className="trainer-metric trainer-metric--accent trainer-metric--button"
                  onClick={() => navigate("/trainer/students")}
                >
                  <span className="trainer-metric__label">
                    <UsersRound size={17} aria-hidden="true" /> Enrolled
                    students
                  </span>
                  <strong>{totalStudents}</strong>
                  <span className="trainer-metric__hint">
                    Across your batches
                  </span>
                </button>
                <button
                  type="button"
                  className="trainer-metric trainer-metric--button"
                  onClick={() => navigate("/trainer/batches")}
                >
                  <span className="trainer-metric__label">
                    <Activity size={17} aria-hidden="true" /> Active batches
                  </span>
                  <strong>
                    {
                      batches.filter((batch) => batch.status === "Active")
                        .length
                    }
                  </strong>
                  <span className="trainer-metric__hint">
                    Currently in progress
                  </span>
                </button>
              </div>
            )}
            <div className="trainer-batch-list">
              {batches.map((batch) => (
                <section className="card trainer-batch" key={batch._id}>
                  <button
                    type="button"
                    className="trainer-batch__header trainer-batch__open"
                    onClick={() => navigate(`/trainer/batches/${batch._id}`)}
                  >
                    <div className="trainer-batch__main">
                      <div className="trainer-batch__title-row">
                        <span
                          className={`status-dot ${batch.status === "Completed" ? "status-dot--done" : ""}`}
                        />
                        <span className="eyebrow">
                          {batch.status || "ACTIVE"}
                        </span>
                      </div>
                      <h2 className="trainer-batch__title">
                        {batch.batchName}
                      </h2>
                      <div className="trainer-batch__meta">
                        <span>{batch.course?.title || "No linked course"}</span>
                        <span>Starts {dateLabel(batch.startDate)}</span>
                      </div>
                      <div className="trainer-batch__schedule">
                        {batch.schedule?.length ? (
                          batch.schedule.map((slot) => (
                            <span className="batch-slot-pill" key={slot._id}>
                              {slot.dayOfWeek} Â· {slot.startTime}-
                              {slot.endTime}
                            </span>
                          ))
                        ) : (
                          <span className="trainer-batch__no-schedule">
                            No timings set
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="trainer-batch__side">
                      <div className="trainer-batch__count">
                        <strong>{batch.studentCount || 0}</strong>
                        <span>students</span>
                      </div>
                      <span className="trainer-batch__open-label">
                        View details
                      </span>
                    </div>
                  </button>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
