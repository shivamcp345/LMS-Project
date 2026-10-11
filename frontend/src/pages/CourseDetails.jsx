import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getCourseById } from "../api/courses";
import { enrollInCourse, getEnrollmentForCourse } from "../api/enrollments";

const ICONS = ["🌐", "✦", "JS", "⚛", "Py", "◆", "▣", "☰"];

function iconFor(text = "") {
  const code = text.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return ICONS[code % ICONS.length];
}

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadCourse() {
    try {
      setLoading(true);
      setError("");

      const [courseRes, enrollmentRes] = await Promise.all([
        getCourseById(id),
        getEnrollmentForCourse(id).catch(() => ({ data: null })),
      ]);

      setCourse(courseRes.data);
      setEnrollment(enrollmentRes.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load this course");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    try {
      setEnrolling(true);
      setError("");

      const response = await enrollInCourse(id);
      setEnrollment(response.data);

      navigate("/my-batch");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to enroll in this course",
      );
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <main className="page">
          <div className="card card__pad empty-state">Loading course…</div>
        </main>
      </AppShell>
    );
  }

  if (error && !course) {
    return (
      <AppShell>
        <main className="page">
          <Link className="back-link" to="/courses">
            ← Back to courses
          </Link>
          <div className="banner banner--error" style={{ marginTop: 16 }}>
            {error}
          </div>
        </main>
      </AppShell>
    );
  }

  if (!course) return null;

  const curriculum = course.curriculum?.length
    ? course.curriculum
    : Array.from({ length: course.lessonsCount || 0 }, (_, i) => ({
        title: `Lesson ${i + 1}`,
        duration: "10 min",
      }));

  const completedLessons = enrollment?.completedLessons || [];

  return (
    <AppShell>
      <main className="page">
        <Link className="back-link" to="/courses">
          ← Back to courses
        </Link>

        {error && (
          <div className="banner banner--error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <section className="detail-hero">
          <div
            className="detail-cover"
            style={
              course.thumbnail
                ? {
                    backgroundImage: `url(${course.thumbnail})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!course.thumbnail && iconFor(course.title)}
          </div>

          <div className="detail-copy">
            <span className="eyebrow">{course.category}</span>
            <h1>{course.title}</h1>
            <p>{course.description}</p>

            <div className="detail-meta">
              <span>★ {course.rating || 4.5} rating</span>
              <span>{curriculum.length} lessons</span>
              <span>{course.duration || "Self paced"}</span>
              <span>{course.level || "Beginner"}</span>
              <span>By {course.instructor}</span>
            </div>

            {enrollment ? (
              <Link className="hero-btn" to="/my-batch">
                {enrollment.status === "completed"
                  ? "Review course"
                  : "Continue learning"}{" "}
                <span>→</span>
              </Link>
            ) : (
              <button
                className="hero-btn"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling
                  ? "Enrolling…"
                  : course.price > 0
                    ? `Enroll now — ₹${course.price}`
                    : "Enroll for free"}{" "}
                <span>→</span>
              </button>
            )}
          </div>
        </section>

        <div className="detail-layout">
          <section>
            <div className="card card__pad">
              <h2>Course content</h2>
              <p>
                {curriculum.length} lessons · {course.duration || "self paced"}
              </p>

              <div style={{ marginTop: 16 }}>
                {curriculum.map((lesson, i) => (
                  <div className="lesson-item" key={i}>
                    <span>
                      {completedLessons.includes(i)
                        ? "✓"
                        : enrollment
                          ? "○"
                          : "🔒"}
                    </span>
                    <div>
                      <strong>
                        {i + 1}. {lesson.title}
                      </strong>
                      <small>{lesson.duration || "10 min"}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="card card__pad">
            <h3>This course includes</h3>
            <div className="learn-points">
              <span>📚 {curriculum.length} lessons</span>
              <span>⏱ {course.duration || "Self paced"}</span>
              <span>🎯 {course.level || "Beginner"} level</span>
              <span>🏷 {course.category}</span>
            </div>

            {enrollment && (
              <>
                <div className="progress-row" style={{ marginTop: 20 }}>
                  <span>Your progress</span>
                  <strong>{enrollment.progress || 0}%</strong>
                </div>
                <div className="progress">
                  <i style={{ width: `${enrollment.progress || 0}%` }} />
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
