import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";

import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
} from "../api/courses";

const COVERS = ["course-cover--1", "course-cover--2", "course-cover--3"];

function coverFor(index) {
  return COVERS[index % COVERS.length];
}

const emptyForm = {
  title: "",
  description: "",
  price: 0,
  level: "Beginner",
  duration: "",
};

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [formData, setFormData] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");
      const response = await getCourses();
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function openCreateForm() {
    setEditingCourse(null);
    setFormData(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(course) {
    setEditingCourse(course);

    setFormData({
      title: course.title || "",
      description: course.description || "",
      price: course.price || 0,
      level: course.level || "Beginner",
      duration: course.duration || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (creating) return;

    setShowForm(false);
    setEditingCourse(null);
    setFormData(emptyForm);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const payload = { ...formData };

      if (editingCourse) {
        const response = await updateCourse(editingCourse._id, payload);

        setCourses((prev) =>
          prev.map((course) =>
            course._id === editingCourse._id ? response.data : course,
          ),
        );

        setSuccess("Course updated successfully");
      } else {
        const response = await createCourse(payload);

        setCourses((prev) => [response.data, ...prev]);

        setSuccess("Course created successfully");
      }

      setShowForm(false);
      setEditingCourse(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error("Course operation error:", error);

      setError(error.response?.data?.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(courseId) {
    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      await deleteCourse(courseId);

      setCourses((prev) => prev.filter((course) => course._id !== courseId));
      setCourseToDelete(null);
      setSuccess("Course deleted successfully");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStatus(course) {
    try {
      setError("");
      const response = await toggleCourseStatus(course._id);
      setCourses((prev) =>
        prev.map((item) => (item._id === course._id ? response.data : item)),
      );
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to update course status",
      );
    }
  }

  const filteredCourses = courses.filter((course) => {
    const query = search.trim().toLowerCase();

    return !query || course.title?.toLowerCase().includes(query);
  });

  return (
    <AppShell>
      <main className="page staff-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">CONTENT</span>

            <h1>Manage courses</h1>

            <p>Create, edit and organize your course catalog.</p>
          </div>

          <button className="hero-btn" onClick={openCreateForm}>
            ＋ Add new course
          </button>
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        {success && <div className="banner banner--success">{success}</div>}

        {showForm && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="course-form-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
              <h2 id="course-form-title">
                {editingCourse ? "Edit course" : "Create new course"}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="field-label">
                    Course name <span className="required-star">*</span>
                    <input
                      className="form-input"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label className="field-label">
                    Price (₹)
                    <input
                      className="form-input"
                      name="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                    />
                  </label>
                  <label className="field-label">
                    Level
                    <select
                      className="form-input"
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Duration <span className="required-star">*</span>
                    <input
                      className="form-input"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      required
                    />
                    <small className="field-help">
                      Use a number with days, weeks, months, years or hours.
                    </small>
                  </label>
                  <label className="field-label field-label--wide">
                    Course description <span className="required-star">*</span>
                    <textarea
                      className="form-input"
                      name="description"
                      rows="5"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    className="hero-btn"
                    type="submit"
                    disabled={creating}
                  >
                    {creating
                      ? editingCourse
                        ? "Updating..."
                        : "Creating..."
                      : editingCourse
                        ? "Update course"
                        : "Create course"}
                  </button>
                  <button
                    className="chip"
                    type="button"
                    onClick={closeForm}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <div className="card">
          <div className="table-toolbar table-toolbar--fancy">
            <div className="search-box">
              ⌕
              <input
                aria-label="Search courses"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <span className="table-count">
              {filteredCourses.length} courses
            </span>
          </div>

          {loading ? (
            <div className="card__pad empty-state">Loading courses…</div>
          ) : filteredCourses.length === 0 ? (
            <div className="card__pad empty-state">No courses found.</div>
          ) : (
            <div className="admin-course-grid">
              {filteredCourses.map((course, index) => (
                <div className="admin-course-card" key={course._id}>
                  <div className={`course-cover ${coverFor(index)}`}>
                    <span>{(course.title || "?")[0]?.toUpperCase()}</span>
                  </div>

                  <div className="admin-course-card__body">
                    <h3>{course.title}</h3>

                    <div className="admin-course-card__meta">
                      <span>{course.level || "Beginner"}</span>
                      <span>{course.duration || "Self paced"}</span>
                      <span
                        className={`status-badge ${course.isActive === false ? "status-badge--inactive" : "status-badge--active"}`}
                      >
                        {course.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </div>

                    <div className="admin-course-card__price">
                      {course.price > 0 ? `₹${course.price}` : "Free"}
                    </div>

                    <div className="admin-course-card__actions">
                      <button
                        className="table-action"
                        onClick={() => openEditForm(course)}
                      >
                        Edit
                      </button>

                      <button
                        className="table-action"
                        onClick={() => handleToggleStatus(course)}
                      >
                        {course.isActive === false ? "Activate" : "Deactivate"}
                      </button>

                      <button
                        className="table-action danger"
                        onClick={() => setCourseToDelete(course)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {courseToDelete && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card modal-card modal-card--confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-course-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setCourseToDelete(null)}
              >
                ×
              </button>
              <h2 id="delete-course-title">Move course to archive?</h2>
              <p>
                “{courseToDelete.title}” will be removed from the active
                catalog. Existing records will be retained.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="table-action danger"
                  onClick={() => handleDelete(courseToDelete._id)}
                  disabled={deleting}
                >
                  {deleting ? "Archiving..." : "Archive course"}
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setCourseToDelete(null)}
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
