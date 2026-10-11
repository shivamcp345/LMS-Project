import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getCourseById } from "../api/courses";
import {
  getEnrollmentForCourse,
  updateLessonProgress,
} from "../api/enrollments";

export default function Learn() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const courseRes = await getCourseById(id);
      setCourse(courseRes.data);

      const enrollmentRes = await getEnrollmentForCourse(id);

      // Learning content is protected: visiting a URL must never silently
      // create an enrollment. The learner must explicitly enroll first.
      if (!enrollmentRes.data) {
        throw new Error(
          "You are not enrolled in this course. Enroll from the course page first.",
        );
      }

      setEnrollment(enrollmentRes.data);

      const completed = enrollmentRes.data.completedLessons || [];
      const curriculumLength =
        courseRes.data.curriculum?.length || courseRes.data.lessonsCount || 1;

      // Jump to the first lesson that isn't finished yet
      const nextLesson = Array.from(
        { length: curriculumLength },
        (_, i) => i,
      ).find((i) => !completed.includes(i));

      setActiveLesson(nextLesson ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load this lesson");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLessonComplete(index) {
    try {
      setSaving(true);
      setError("");

      const response = await updateLessonProgress(id, index);
      setEnrollment(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update progress");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <main className="page learn-page">
          <div className="card card__pad empty-state">Loading lesson…</div>
        </main>
      </AppShell>
    );
  }

  if (error && !course) {
    return (
      <AppShell>
        <main className="page learn-page">
          <Link className="back-link" to="/my-courses">
            ← Back to my learning
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
    : Array.from({ length: course.lessonsCount || 1 }, (_, i) => ({
        title: `Lesson ${i + 1}`,
        duration: "10 min",
      }));

  const completedLessons = enrollment?.completedLessons || [];
  const lesson = curriculum[activeLesson] || curriculum[0];
  const isCompleted = completedLessons.includes(activeLesson);

  return (
    <AppShell>
      <main className="page learn-page">
        <Link className="back-link" to="/my-courses">
          ← Back to my learning
        </Link>

        {error && (
          <div className="banner banner--error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div className="video-box">
          <div className="play">▶</div>
          <span>
            Lesson {activeLesson + 1} · {lesson?.title}
          </span>
        </div>

        <div className="lesson-layout">
          <section>
            <div className="lesson-title">
              <span className="eyebrow">
                {course.title.toUpperCase()} • LESSON {activeLesson + 1}
              </span>
              <h1>{lesson?.title}</h1>
              <p>{course.description}</p>
            </div>

            <div className="card card__pad">
              <h2>Lesson overview</h2>
              <p>
                This lesson is part of {course.title}, taught by{" "}
                {course.instructor}. Estimated duration:{" "}
                {lesson?.duration || "10 min"}.
              </p>

              <button
                className="hero-btn"
                style={{ marginTop: 18 }}
                onClick={() => toggleLessonComplete(activeLesson)}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : isCompleted
                    ? "✓ Mark as incomplete"
                    : "Mark lesson as complete"}
              </button>
            </div>
          </section>

          <aside className="card lesson-sidebar">
            <h3>Course content</h3>
            <div className="progress-row">
              <span>Progress</span>
              <strong>{enrollment?.progress || 0}%</strong>
            </div>
            <div className="progress" style={{ marginBottom: 14 }}>
              <i style={{ width: `${enrollment?.progress || 0}%` }} />
            </div>

            {curriculum.map((item, i) => (
              <div
                className={`lesson-item ${i === activeLesson ? "active" : ""}`}
                key={i}
                onClick={() => setActiveLesson(i)}
                style={{ cursor: "pointer" }}
              >
                <span>
                  {completedLessons.includes(i)
                    ? "✓"
                    : i === activeLesson
                      ? "▶"
                      : "○"}
                </span>
                <div>
                  <strong>
                    {i + 1}. {item.title}
                  </strong>
                  <small>{item.duration || "10 min"}</small>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
