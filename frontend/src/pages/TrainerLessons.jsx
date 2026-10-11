import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getBatches, getTrainerBatches } from "../api/batches";
import { useAuth } from "../context/AuthContext";
import {
  createLesson,
  deleteLesson,
  getLessonsByBatch,
  updateLesson,
} from "../api/lessons";

const emptyForm = {
  title: "",
  description: "",
  videoUrl: "",
  duration: "",
  order: 1,
};

export default function TrainerLessons() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const [batch, setBatch] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const nextOrder = useMemo(
    () =>
      Math.max(0, ...lessons.map((lesson) => Number(lesson.order) || 0)) + 1,
    [lessons],
  );

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [batchResponse, lessonResponse] = await Promise.all([
        user?.role === "admin" ? getBatches() : getTrainerBatches(),
        getLessonsByBatch(batchId),
      ]);
      const batches = Array.isArray(batchResponse.data)
        ? batchResponse.data
        : [];
      const current = batches.find((item) => item._id === batchId);
      if (!current) throw new Error("You are not assigned to this batch");
      setBatch(current);
      setLessons(Array.isArray(lessonResponse.data) ? lessonResponse.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load lesson content",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [batchId, user?.role]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, order: nextOrder });
  }

  function startEdit(lesson) {
    setEditingId(lesson._id);
    setForm({
      title: lesson.title || "",
      description: lesson.description || "",
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || "",
      order: lesson.order || 1,
    });
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = { ...form, batch: batchId };
      if (editingId) {
        const response = await updateLesson(editingId, payload);
        setLessons((current) =>
          current.map((lesson) =>
            lesson._id === editingId ? response.data : lesson,
          ),
        );
        setSuccess("Lesson updated successfully");
      } else {
        const response = await createLesson(payload);
        setLessons((current) =>
          [...current, response.data].sort(
            (a, b) => (a.order || 0) - (b.order || 0),
          ),
        );
        setSuccess("Lesson added successfully");
      }
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save lesson");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(lesson) {
    if (!window.confirm(`Delete “${lesson.title}”?`)) return;
    try {
      setError("");
      await deleteLesson(lesson._id);
      setLessons((current) =>
        current.filter((item) => item._id !== lesson._id),
      );
      if (editingId === lesson._id) resetForm();
      setSuccess("Lesson deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete lesson");
    }
  }

  return (
    <AppShell>
      <main className="page staff-page">
        <Link
          className="back-link"
          to={user?.role === "admin" ? "/admin/batches" : "/trainer/batches"}
        >
          ← Back to {user?.role === "admin" ? "batches" : "my batches"}
        </Link>

        <div className="page__head" style={{ marginTop: 16 }}>
          <div>
            <span className="eyebrow">CONTENT MANAGEMENT</span>
            <h1>{batch?.batchName || "Batch lessons"}</h1>
            <p>
              {batch?.course?.title || "Assigned batch"} · Build and maintain
              your lesson library.
            </p>
          </div>
        </div>

        {error && <div className="banner banner--error">{error}</div>}
        {success && <div className="banner banner--success">{success}</div>}

        {loading ? (
          <div className="card card__pad empty-state">
            Loading lesson content…
          </div>
        ) : (
          <div className="detail-layout">
            <section className="card card__pad">
              <div className="section-head">
                <div>
                  <h2>{editingId ? "Edit lesson" : "Add lesson"}</h2>
                  <p>
                    Use a YouTube URL for video-based lessons, or leave it empty
                    for text/live content.
                  </p>
                </div>
                {editingId && (
                  <button type="button" className="chip" onClick={resetForm}>
                    Cancel edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="field-label">
                    Lesson title *
                    <input
                      className="form-input"
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />
                  </label>
                  <label className="field-label">
                    Duration
                    <input
                      className="form-input"
                      placeholder="30 min"
                      value={form.duration}
                      onChange={(e) =>
                        setForm({ ...form, duration: e.target.value })
                      }
                    />
                  </label>
                  <label className="field-label">
                    Order
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={form.order}
                      onChange={(e) =>
                        setForm({ ...form, order: e.target.value })
                      }
                    />
                  </label>
                  <label className="field-label field-label--wide">
                    Video URL
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={form.videoUrl}
                      onChange={(e) =>
                        setForm({ ...form, videoUrl: e.target.value })
                      }
                    />
                  </label>
                  <label className="field-label field-label--wide">
                    Lesson description
                    <textarea
                      className="form-input"
                      rows="4"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button className="hero-btn" type="submit" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Update lesson"
                      : "Add lesson"}
                </button>
              </form>
            </section>

            <aside className="card card__pad">
              <div className="section-head">
                <div>
                  <h3>Lesson library</h3>
                  <p>
                    {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {lessons.length === 0 ? (
                <div className="empty-state">
                  No lessons yet. Add the first one.
                </div>
              ) : (
                lessons.map((lesson, index) => (
                  <div className="lesson-item" key={lesson._id}>
                    <span>{index + 1}</span>
                    <div style={{ flex: 1 }}>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.duration || "Duration not set"}</small>
                    </div>
                    <button
                      className="table-action"
                      type="button"
                      onClick={() => startEdit(lesson)}
                    >
                      Edit
                    </button>
                    <button
                      className="table-action table-action--danger"
                      type="button"
                      onClick={() => handleDelete(lesson)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </aside>
          </div>
        )}
      </main>
    </AppShell>
  );
}
