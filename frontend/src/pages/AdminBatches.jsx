import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { Link } from "react-router-dom";

import {
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  toggleBatchStatus,
  getBatchStudents,
  getEligibleBatchStudents,
  addStudentToBatch,
  removeStudentFromBatch,
} from "../api/batches";
import { getCourses } from "../api/courses";
import { listUsers } from "../api/users";

const emptyScheduleSlot = () => ({
  dayOfWeek: "Mon",
  startTime: "10:00",
  endTime: "11:00",
  meetLink: "",
});

const emptyForm = () => ({
  batchName: "",
  course: "",
  trainer: "",
  status: "Active",
  startDate: new Date().toISOString().slice(0, 10),
  schedule: [emptyScheduleSlot()],
});

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function endDateForCourse(startDate, duration) {
  const match = String(duration || "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?|hours?)$/i);
  if (!match || !startDate) return "";

  const date = new Date(`${startDate}T00:00:00Z`);
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("hour")) {
    date.setUTCHours(date.getUTCHours() + amount);
  } else if (unit.startsWith("day")) {
    date.setUTCDate(date.getUTCDate() + amount);
  } else if (unit.startsWith("week")) {
    date.setUTCDate(date.getUTCDate() + amount * 7);
  } else {
    const months = amount * (unit.startsWith("year") ? 12 : 1);
    const wholeMonths = Math.trunc(months);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + wholeMonths);
    date.setUTCDate(
      Math.min(
        day,
        new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate(),
      ),
    );
    date.setUTCDate(date.getUTCDate() + (months - wholeMonths) * 30);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getReferenceId(value) {
  return typeof value === "object" ? value?._id || "" : value || "";
}

function getListData(response) {
  return Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];
}

export default function AdminBatches() {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  // Roster management (expanded batch + its students)
  const [rosterBatchId, setRosterBatchId] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [rosterSearch, setRosterSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [rosterError, setRosterError] = useState("");
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadBatches() {
    try {
      setLoading(true);
      setError("");

      const response = await getBatches();
      setBatches(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
    loadCourses();
    loadUsers();
  }, []);

  async function loadCourses() {
    try {
      const response = await getCourses();
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load courses");
    }
  }

  async function loadUsers() {
    try {
      const users = await listUsers();
      setAllUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load trainer list");
    }
  }

  function openCreateForm() {
    setEditingBatch(null);
    setFormData(emptyForm());
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(batch) {
    setEditingBatch(batch);

    setFormData({
      batchName: batch.batchName || "",
      course: batch.course?._id || "",
      trainer: getReferenceId(batch.trainer),
      status: batch.status || "Active",
      startDate: formatDate(batch.startDate),
      schedule:
        Array.isArray(batch.schedule) && batch.schedule.length
          ? batch.schedule.map((slot) => ({
              dayOfWeek: slot.dayOfWeek || "Mon",
              startTime: slot.startTime || "10:00",
              endTime: slot.endTime || "11:00",
              meetLink: slot.meetLink || "",
            }))
          : [emptyScheduleSlot()],
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingBatch(null);
    setFormData(emptyForm());
    setError("");
  }

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function updateScheduleSlot(index, field, value) {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  }

  function addScheduleSlot() {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, emptyScheduleSlot()],
    }));
  }

  function removeScheduleSlot(index) {
    setFormData((prev) => ({
      ...prev,
      schedule:
        prev.schedule.length > 1
          ? prev.schedule.filter((_, slotIndex) => slotIndex !== index)
          : prev.schedule,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        ...formData,
        course: formData.course,
        trainer: formData.trainer || null,
      };

      if (editingBatch) {
        const response = await updateBatch(editingBatch._id, payload);

        setBatches((prev) =>
          prev.map((batch) =>
            batch._id === editingBatch._id
              ? { ...response.data, studentCount: batch.studentCount }
              : batch,
          ),
        );

        setSuccess("Batch updated successfully");
      } else {
        const response = await createBatch(payload);

        setBatches((prev) => [{ ...response.data, studentCount: 0 }, ...prev]);

        setSuccess("Batch created successfully");
      }

      setShowForm(false);
      setEditingBatch(null);
      setFormData(emptyForm());
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(batchId) {
    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      await deleteBatch(batchId);

      setBatches((prev) => prev.filter((batch) => batch._id !== batchId));

      if (rosterBatchId === batchId) {
        setRosterBatchId(null);
      }

      setBatchToDelete(null);
      setSuccess("Batch deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete batch");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStatus(batch) {
    try {
      const response = await toggleBatchStatus(batch._id);
      setBatches((prev) =>
        prev.map((item) => (item._id === batch._id ? response.data : item)),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update batch status");
    }
  }

  async function toggleRoster(batchId) {
    if (rosterBatchId === batchId) {
      setRosterBatchId(null);
      setRosterSearch("");
      setStudentSearch("");
      return;
    }

    setRosterBatchId(batchId);
    setRosterError("");
    setRosterSearch("");
    setStudentSearch("");
    setEligiblePage(1);
    await loadRoster(batchId);
    await loadEligibleStudents(batchId, 1, "");
  }

  async function loadRoster(batchId) {
    try {
      setRosterLoading(true);
      const response = await getBatchStudents(batchId);
      setRosterStudents(getListData(response));
    } catch (err) {
      setRosterError(err.response?.data?.message || "Failed to load students");
    } finally {
      setRosterLoading(false);
    }
  }

  async function loadEligibleStudents(batchId, page, search) {
    try {
      setEligibleLoading(true);
      const result = await getEligibleBatchStudents(batchId, { page, search });
      setEligibleStudents(result.students);
      setEligibleTotal(result.total);
      setEligiblePage(result.page);
    } catch (err) {
      setRosterError(
        err.response?.data?.message || "Failed to load eligible students",
      );
      setEligibleStudents([]);
      setEligibleTotal(0);
    } finally {
      setEligibleLoading(false);
    }
  }

  async function handleAddStudent(studentId) {
    try {
      setRosterError("");
      const response = await addStudentToBatch(rosterBatchId, studentId);
      setRosterStudents(getListData(response));
      await loadEligibleStudents(rosterBatchId, eligiblePage, studentSearch);

      setBatches((prev) =>
        prev.map((batch) =>
          batch._id === rosterBatchId
            ? { ...batch, studentCount: (batch.studentCount || 0) + 1 }
            : batch,
        ),
      );
    } catch (err) {
      setRosterError(
        err.response?.data?.message || "Failed to add student to batch",
      );
    }
  }

  async function handleRemoveStudent(studentId) {
    try {
      setRosterError("");
      const response = await removeStudentFromBatch(rosterBatchId, studentId);
      setRosterStudents(getListData(response));
      await loadEligibleStudents(rosterBatchId, eligiblePage, studentSearch);

      setBatches((prev) =>
        prev.map((batch) =>
          batch._id === rosterBatchId
            ? {
                ...batch,
                studentCount: Math.max(0, (batch.studentCount || 1) - 1),
              }
            : batch,
        ),
      );
    } catch (err) {
      setRosterError(
        err.response?.data?.message || "Failed to remove student from batch",
      );
    }
  }

  const filteredBatches = batches.filter((batch) => {
    const query = search.trim().toLowerCase();

    return (
      !query ||
      batch.batchName?.toLowerCase().includes(query) ||
      batch.course?.title?.toLowerCase().includes(query)
    );
  });

  const filteredRosterStudents = rosterStudents.filter((student) => {
    const query = rosterSearch.trim().toLowerCase();

    return (
      !query ||
      student.name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.mobile?.toLowerCase().includes(query) ||
      student.address?.toLowerCase().includes(query)
    );
  });

  const visibleRosterStudents = rosterSearch.trim()
    ? filteredRosterStudents
    : rosterStudents;

  const activeCourse = courses.find((course) => course._id === formData.course);
  const derivedEndDate = endDateForCourse(
    formData.startDate,
    activeCourse?.duration,
  );

  return (
    <AppShell>
      <main className="page staff-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">SCHEDULING</span>
            <h1>Manage batches</h1>
            <p>Link courses, manage batch status and add enrolled students.</p>
          </div>

          <button className="hero-btn" onClick={openCreateForm}>
            ＋ Add new batch
          </button>
        </div>

        {error && <div className="banner banner--error">{error}</div>}
        {success && <div className="banner banner--success">{success}</div>}

        {showForm && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card batch-editor modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="batch-form-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
              <div className="batch-editor__header">
                <div>
                  <span className="eyebrow">BATCH SETUP</span>
                  <h2 id="batch-form-title">
                    {editingBatch ? "Edit batch" : "Create new batch"}
                  </h2>
                  <p>Link a course to calculate this batch's schedule.</p>
                </div>
                <span className="batch-editor__step">01 / 01</span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="field-label">
                    Batch name <span className="required-star">*</span>
                    <input
                      className="form-input"
                      name="batchName"
                      value={formData.batchName}
                      onChange={handleFieldChange}
                      required
                    />
                  </label>

                  <label className="field-label">
                    Linked course <span className="required-star">*</span>
                    <select
                      className="form-input"
                      name="course"
                      value={formData.course}
                      onChange={handleFieldChange}
                      required
                    >
                      <option value="">Select a course</option>
                      {courses
                        .filter((course) => course.isActive !== false)
                        .map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="field-label">
                    Trainer
                    <select
                      className="form-input"
                      name="trainer"
                      value={formData.trainer}
                      onChange={handleFieldChange}
                    >
                      <option value="">No trainer assigned</option>
                      {allUsers
                        .filter((user) => user.role === "trainer")
                        .map((trainer) => (
                          <option
                            key={trainer._id || trainer.id}
                            value={trainer._id || trainer.id}
                          >
                            {trainer.name} ({trainer.email})
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="field-label">
                    Start date <span className="required-star">*</span>
                    <input
                      className="form-input"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleFieldChange}
                      required
                    />
                  </label>

                  <label className="field-label">
                    End date (based on course duration)
                    <input
                      className="form-input"
                      type="date"
                      value={derivedEndDate}
                      readOnly
                      aria-label="Automatically calculated batch end date"
                    />
                  </label>

                  <label className="field-label">
                    Batch status
                    <select
                      className="form-input"
                      name="status"
                      value={formData.status}
                      onChange={handleFieldChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                </div>

                <div className="batch-schedule-editor">
                  <div className="batch-schedule-editor__head">
                    <div>
                      <h3>Weekly class schedule</h3>
                      <p>
                        Set the weekly class days and timings. Trainers add the meeting link from their batch page.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="chip"
                      onClick={addScheduleSlot}
                    >
                      ＋ Add slot
                    </button>
                  </div>

                  <div className="batch-schedule-list">
                    {formData.schedule.map((slot, index) => (
                      <div
                        className="batch-schedule-row"
                        key={`${index}-${slot.dayOfWeek}`}
                      >
                        <label className="field-label">
                          Day
                          <select
                            className="form-input"
                            value={slot.dayOfWeek}
                            onChange={(e) =>
                              updateScheduleSlot(
                                index,
                                "dayOfWeek",
                                e.target.value,
                              )
                            }
                          >
                            {[
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                              "Sun",
                            ].map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field-label">
                          Start
                          <input
                            className="form-input"
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              updateScheduleSlot(
                                index,
                                "startTime",
                                e.target.value,
                              )
                            }
                          />
                        </label>

                        <label className="field-label">
                          End
                          <input
                            className="form-input"
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              updateScheduleSlot(
                                index,
                                "endTime",
                                e.target.value,
                              )
                            }
                          />
                        </label>

                        <button
                          type="button"
                          className="table-action danger"
                          onClick={() => removeScheduleSlot(index)}
                          disabled={formData.schedule.length === 1}
                          aria-label="Remove schedule slot"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.course && !derivedEndDate && (
                  <div className="banner banner--error">
                    Enter the selected course duration as a number of days,
                    weeks, months, years or hours before creating a batch.
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="hero-btn"
                    type="submit"
                    disabled={saving || !formData.course || !derivedEndDate}
                  >
                    {saving
                      ? editingBatch
                        ? "Updating..."
                        : "Creating..."
                      : editingBatch
                        ? "Update batch"
                        : "Create batch"}
                  </button>

                  <button
                    className="chip"
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <div className="card batch-list-panel">
          <div className="table-toolbar table-toolbar--fancy">
            <div className="search-box">
              ⌕
              <input
                aria-label="Search batches"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <span className="table-count">
              {filteredBatches.length} batches
            </span>
          </div>

          {loading ? (
            <div className="card__pad empty-state">Loading batches…</div>
          ) : filteredBatches.length === 0 ? (
            <div className="card__pad empty-state">No batches found.</div>
          ) : (
            <div className="batch-grid">
              {filteredBatches.map((batch) => (
                <div className="batch-card" key={batch._id}>
                  <div className="batch-card__top">
                    <div>
                      <h3>{batch.batchName}</h3>
                      <p>{batch.course?.title || "No linked course"}</p>
                      <span className="batch-card__trainer">
                        Trainer: {batch.trainer?.name || "Not assigned"}
                      </span>
                    </div>

                    <span
                      className={`pill ${
                        batch.status === "Completed"
                          ? "pill--yellow"
                          : batch.status === "Inactive"
                            ? "pill--red"
                            : "pill--green"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </div>

                  <div className="batch-card__meta">
                    <span>
                      📅 {formatDate(batch.startDate) || "—"} –{" "}
                      {formatDate(batch.endDate) || "—"}
                    </span>
                    <span>👥 {batch.studentCount || 0} students</span>
                    <span>
                      🕒{" "}
                      {Array.isArray(batch.schedule) && batch.schedule.length
                        ? batch.schedule
                            .map(
                              (slot) =>
                                `${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}`,
                            )
                            .join(" · ")
                        : "Schedule not set"}
                    </span>
                  </div>

                  <div className="batch-card__actions">
                    <button
                      className="table-action"
                      onClick={() => openEditForm(batch)}
                    >
                      Edit
                    </button>

                    <button
                      className="table-action"
                      onClick={() => toggleRoster(batch._id)}
                    >
                      {rosterBatchId === batch._id
                        ? "Hide students"
                        : "Manage students"}
                    </button>

                    <button
                      className="table-action"
                      onClick={() => handleToggleStatus(batch)}
                    >
                      {batch.status === "Inactive" ? "Activate" : "Deactivate"}
                    </button>

                    <button
                      className="table-action danger"
                      onClick={() => setBatchToDelete(batch)}
                    >
                      Delete
                    </button>
                  </div>

                  {rosterBatchId === batch._id && (
                    <div className="batch-roster">
                      {rosterError && (
                        <div className="banner banner--error">
                          {rosterError}
                        </div>
                      )}

                      <div className="batch-roster__section">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                          }}
                        >
                          <strong>
                            Batch students ({visibleRosterStudents.length})
                          </strong>

                          <div className="search-box batch-roster__search">
                            ⌕
                            <input
                              aria-label="Search batch students"
                              value={rosterSearch}
                              onChange={(e) => setRosterSearch(e.target.value)}
                            />
                          </div>
                        </div>

                        {rosterLoading ? (
                          <div className="empty-state">Loading…</div>
                        ) : visibleRosterStudents.length === 0 ? (
                          <div className="empty-state">
                            {rosterStudents.length === 0
                              ? "No students in this batch yet. Add students below to build this batch roster."
                              : "No enrolled student matches this filter."}
                          </div>
                        ) : (
                          <div className="batch-roster__table-wrap">
                            <table className="batch-roster__table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Mobile</th>
                                  <th>Address</th>
                                  <th>Status</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleRosterStudents.map((student) => {
                                  const status =
                                    student.status ||
                                    (student.isActive === false
                                      ? "Inactive"
                                      : "Active");

                                  return (
                                    <tr key={student._id || student.id}>
                                      <td>
                                        <div className="batch-roster__name-cell">
                                          <div className="mini-avatar">
                                            {(student.name ||
                                              "U")[0].toUpperCase()}
                                          </div>
                                          <span>{student.name}</span>
                                        </div>
                                      </td>
                                      <td>{student.email}</td>
                                      <td>
                                        {student.mobile || "Not provided"}
                                      </td>
                                      <td>
                                        {student.address || "Not provided"}
                                      </td>
                                      <td>
                                        <span
                                          className={`status-badge status-badge--${status.toLowerCase()}`}
                                        >
                                          {status}
                                        </span>
                                      </td>
                                      <td>
                                        {student.mappingId && (
                                          <button
                                            className="table-action danger"
                                            onClick={() =>
                                              handleRemoveStudent(
                                                student._id || student.id,
                                              )
                                            }
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="batch-roster__section">
                        <strong>
                          Add an enrolled student (5 shown per page)
                        </strong>

                        <div className="search-box batch-roster__search">
                          ⌕
                          <input
                            aria-label="Search course-enrolled students"
                            value={studentSearch}
                            onChange={(e) => {
                              const value = e.target.value;
                              setStudentSearch(value);
                              setEligiblePage(1);
                              loadEligibleStudents(rosterBatchId, 1, value);
                            }}
                          />
                        </div>

                        <div className="batch-roster__list">
                          {eligibleLoading ? (
                            <div className="empty-state">
                              Loading enrolled students…
                            </div>
                          ) : eligibleStudents.length === 0 ? (
                            <div className="empty-state">
                              {studentSearch.trim()
                                ? "No enrolled students match this search."
                                : "No unassigned students enrolled in this course."}
                            </div>
                          ) : (
                            eligibleStudents.map((student) => (
                              <div
                                className="batch-roster__student"
                                key={student._id || student.id}
                              >
                                <div className="mini-avatar">
                                  {(student.name || "U")[0].toUpperCase()}
                                </div>
                                <div className="batch-roster__student-info">
                                  <strong>{student.name}</strong>
                                  <span>{student.email}</span>
                                </div>
                                <button
                                  className="table-action"
                                  onClick={() =>
                                    handleAddStudent(student._id || student.id)
                                  }
                                >
                                  Add
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        {eligibleTotal > 5 && (
                          <div className="batch-student-pagination">
                            <span>
                              Showing {(eligiblePage - 1) * 5 + 1}–
                              {Math.min(eligiblePage * 5, eligibleTotal)} of{" "}
                              {eligibleTotal}
                            </span>
                            <button
                              className="table-action"
                              type="button"
                              disabled={eligiblePage === 1 || eligibleLoading}
                              onClick={() =>
                                loadEligibleStudents(
                                  rosterBatchId,
                                  eligiblePage - 1,
                                  studentSearch,
                                )
                              }
                            >
                              Previous
                            </button>
                            <button
                              className="table-action"
                              type="button"
                              disabled={
                                eligiblePage * 5 >= eligibleTotal ||
                                eligibleLoading
                              }
                              onClick={() =>
                                loadEligibleStudents(
                                  rosterBatchId,
                                  eligiblePage + 1,
                                  studentSearch,
                                )
                              }
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {batchToDelete && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card modal-card modal-card--confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-batch-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setBatchToDelete(null)}
              >
                ×
              </button>
              <h2 id="delete-batch-title">Move batch to archive?</h2>
              <p>
                “{batchToDelete.batchName}” will be removed from active batches.
                Existing student and course records will be retained.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="table-action danger"
                  onClick={() => handleDelete(batchToDelete._id)}
                  disabled={deleting}
                >
                  {deleting ? "Archiving..." : "Archive batch"}
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setBatchToDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
