import { useMemo, useState } from "react";

const STATUS_LABELS = {
  present: "Present",
  absent: "Absent",
  online: "Online",
  late: "Late",
  approvedLeave: "Approved leave",
  paused: "Paused",
  holiday: "Holiday",
  noClass: "No class",
};

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function AttendanceCalendar({
  records = [],
  joinedAt,
  editable = false,
  onMark,
}) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState("");
  const [status, setStatus] = useState("present");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const monthStart = new Date(`${month}-01T00:00:00`);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const joinedDay = joinedAt ? new Date(joinedAt) : null;
  const byDate = useMemo(
    () =>
      new Map(
        records.map((record) => [record.date.slice(0, 10), record.status]),
      ),
    [records],
  );
  const summary = useMemo(
    () =>
      records.reduce(
        (counts, record) => {
          if (record.status in counts) counts[record.status] += 1;
          return counts;
        },
        {
          present: 0,
          absent: 0,
          online: 0,
          late: 0,
          approvedLeave: 0,
          paused: 0,
        },
      ),
    [records],
  );
  const effective =
    summary.present + summary.online + summary.absent + summary.late;
  const rate = effective
    ? Math.round(((summary.present + summary.online) / effective) * 100)
    : 0;
  const currentMonth = monthStart.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  function moveMonth(amount) {
    const next = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + amount,
      1,
    );
    setMonth(monthKey(next));
    setSelectedDate("");
  }

  async function saveSelectedDate() {
    if (!selectedDate || !onMark) return;
    try {
      setSaving(true);
      setMessage("");
      await onMark(selectedDate, status);
      setMessage("Attendance saved.");
      setSelectedDate("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="attendance-calendar-card">
      <div className="attendance-calendar-layout">
        <div className="attendance-dashboard-stats">
          {[
            ["present", "Present", "✓"],
            ["absent", "Absent", "×"],
            ["late", "Late", "◴"],
            ["online", "Online", "○"],
            ["approvedLeave", "Approved leave", "✉"],
            ["paused", "Paused", "Ⅱ"],
          ].map(([key, label, icon]) => (
            <article
              className={`attendance-stat attendance-stat--${key}`}
              key={key}
            >
              <span>{icon}</span>
              <div>
                <strong>{summary[key]}</strong>
                <small>{label}</small>
              </div>
            </article>
          ))}
          <article className="attendance-rate-card">
            <strong>Overall rate</strong>
            <span>
              {summary.present + summary.online} effective · {effective} total
            </span>
            <div
              className="attendance-rate-ring"
              style={{ "--rate": `${rate * 3.6}deg` }}
            >
              <b>{rate}%</b>
              <small>rate</small>
            </div>
            <div className="attendance-rate-bar">
              <i style={{ width: `${rate}%` }} />
            </div>
            <div className="attendance-rate-labels">
              <span>0%</span>
              <b>75%</b>
              <span>100%</span>
            </div>
          </article>
          <article className="attendance-breakdown">
            <strong>Breakdown</strong>
            {[
              "present",
              "absent",
              "online",
              "late",
              "approvedLeave",
              "paused",
            ].map((key) => (
              <div key={key}>
                <span>{STATUS_LABELS[key]}</span>
                <i>
                  <b
                    className={`is-${key}`}
                    style={{
                      width: `${records.length ? Math.max((summary[key] / records.length) * 100, summary[key] ? 3 : 0) : 0}%`,
                    }}
                  />
                </i>
                <strong>{summary[key]}</strong>
              </div>
            ))}
          </article>
        </div>
        <div className="attendance-month-card">
          <header>
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>
            <strong>{currentMonth}</strong>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </header>
          <div className="attendance-calendar-grid attendance-calendar-grid--labels">
            {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((day) => (
              <b key={day}>{day}</b>
            ))}
          </div>
          <div className="attendance-calendar-grid">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const date = `${month}-${String(day).padStart(2, "0")}`;
              const dayDate = new Date(`${date}T00:00:00`);
              const disabled =
                (joinedDay &&
                  dayDate <
                    new Date(
                      joinedDay.getFullYear(),
                      joinedDay.getMonth(),
                      joinedDay.getDate(),
                    )) ||
                dayDate > today;
              const dayStatus = byDate.get(date);
              return (
                <button
                  type="button"
                  key={date}
                  className={`attendance-day ${dayStatus ? `is-${dayStatus}` : ""} ${selectedDate === date ? "is-selected" : ""}`}
                  disabled={!editable || disabled}
                  title={
                    dayStatus
                      ? STATUS_LABELS[dayStatus]
                      : disabled
                        ? "Outside your batch dates"
                        : "No attendance record"
                  }
                  onClick={() => {
                    setSelectedDate(date);
                    setStatus(
                      dayStatus && dayStatus in STATUS_LABELS
                        ? dayStatus
                        : "present",
                    );
                    setMessage("");
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {editable && (
            <div className="attendance-mark-controls">
              <label>
                Mark selected day
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="hero-btn"
                disabled={!selectedDate || saving}
                onClick={saveSelectedDate}
              >
                {saving
                  ? "Saving…"
                  : selectedDate
                    ? `Save ${selectedDate}`
                    : "Select a day"}
              </button>
              {message && <small role="status">{message}</small>}
            </div>
          )}
          <div className="attendance-calendar-legend">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <span key={status}>
                <i className={`is-${status}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
