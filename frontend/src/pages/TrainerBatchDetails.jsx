import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
  getTrainerBatchDetails,
  updateTrainerMeetingLink,
} from "../api/batches";

function dateLabel(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export default function TrainerBatchDetails() {
  const { batchId } = useParams();
  const [details, setDetails] = useState(null);
  const [meetingLinks, setMeetingLinks] = useState({});
  const [linkFeedback, setLinkFeedback] = useState({});
  const [savingSlotId, setSavingSlotId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getTrainerBatchDetails(batchId)
      .then((response) => {
        setDetails(response.data);
        setMeetingLinks(
          Object.fromEntries(
            (response.data.batch.schedule || []).map((slot) => [
              slot._id,
              slot.meetLink || "",
            ]),
          ),
        );
      })
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Could not load batch details",
        ),
      )
      .finally(() => setLoading(false));
  }, [batchId]);

  async function saveMeetingLink(slot) {
    setSavingSlotId(slot._id);
    setLinkFeedback((current) => ({ ...current, [slot._id]: "Saving…" }));
    try {
      const response = await updateTrainerMeetingLink(
        batchId,
        slot._id,
        meetingLinks[slot._id] || "",
      );
      setDetails((current) => ({
        ...current,
        batch: {
          ...current.batch,
          schedule: current.batch.schedule.map((item) =>
            item._id === slot._id ? response.data : item,
          ),
        },
      }));
      setLinkFeedback((current) => ({ ...current, [slot._id]: response.message }));
    } catch (requestError) {
      setLinkFeedback((current) => ({
        ...current,
        [slot._id]: requestError.response?.data?.message || "Could not save meeting link",
      }));
    } finally {
      setSavingSlotId(null);
    }
  }

  const students = (details?.students || []).filter((student) =>
    `${student.name} ${student.email} ${student.mobile || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <AppShell>
      <main className="page trainer-batch-details-page">
        <Link className="back-link" to="/trainer/batches">
          ← Back to assigned batches
        </Link>
        {loading ? (
          <div className="card card__pad empty-state">
            Loading batch details…
          </div>
        ) : error ? (
          <div className="banner banner--error">{error}</div>
        ) : (
          <>
            <section className="card trainer-detail-hero">
              <div className="trainer-detail-summary">
                <span className="eyebrow">ASSIGNED BATCH</span>
                <h1>{details.batch.batchName}</h1>
                <p>
                  {details.batch.course?.title || "Course"} ·{" "}
                  {details.batch.status}
                </p>
              </div>
              <div className="trainer-detail-dates">
                <span>
                  Start date
                  <strong>{dateLabel(details.batch.startDate)}</strong>
                </span>
                <span>
                  End date<strong>{dateLabel(details.batch.endDate)}</strong>
                </span>
              </div>
              <Link
                className="hero-btn trainer-detail-tests-link"
                to={`/trainer/batches/${batchId}/tests`}
              >
                Tests and results
              </Link>
            </section>
            <section className="card trainer-detail-schedule">
              <div className="section-heading">
                <div>
                  <h2>Batch schedule</h2>
                  <p>Set up the class in your meeting provider, then add its HTTPS link here for students.</p>
                </div>
              </div>
              {details.batch.schedule?.length ? (
                <div className="schedule-detail-list">
                  {details.batch.schedule.map((slot) => (
                    <div className="schedule-detail-row" key={slot._id}>
                      <strong>{slot.dayOfWeek}</strong>
                      <span>
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <div className="trainer-meeting-link-controls">
                        <input
                          type="url"
                          aria-label={`${slot.dayOfWeek} meeting link`}
                          placeholder="https://meet.google.com/..."
                          maxLength={2048}
                          value={meetingLinks[slot._id] || ""}
                          onChange={(event) =>
                            setMeetingLinks((current) => ({
                              ...current,
                              [slot._id]: event.target.value,
                            }))
                          }
                        />
                        <button
                          className="hero-btn"
                          type="button"
                          disabled={savingSlotId === slot._id}
                          onClick={() => saveMeetingLink(slot)}
                        >
                          {savingSlotId === slot._id ? "Saving…" : "Save link"}
                        </button>
                        {slot.meetLink && (
                          <a
                            className="chip"
                            href={slot.meetLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open meeting
                          </a>
                        )}
                        {linkFeedback[slot._id] && (
                          <small aria-live="polite">{linkFeedback[slot._id]}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No schedule has been set.</p>
              )}
            </section>
            <section className="trainer-detail-students card">
              <div className="section-heading trainer-detail-roster-heading">
                <div>
                  <span className="eyebrow">ROSTER</span>
                  <h2>
                    Enrolled students{" "}
                    <span className="count-badge">
                      {details.students.length}
                    </span>
                  </h2>
                  <p>
                    Choose a student to open their profile and attendance
                    calendar.
                  </p>
                </div>
                <input
                  className="trainer-detail-search"
                  aria-label="Search students"
                  placeholder="Search students"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              {students.length ? (
                <div className="trainer-enrolled-grid">
                  {students.map((student) => (
                    <Link
                      className="card trainer-enrolled-student"
                      key={student._id}
                      to={`/trainer/batches/${batchId}/students/${student._id}`}
                    >
                      <span className="trainer-detail-avatar">
                        {(student.name || "S").slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                        <span>{student.mobile || "No mobile number"}</span>
                      </div>
                      <b>›</b>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card card__pad empty-state">
                  No students found.
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
