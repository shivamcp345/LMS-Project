import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
  getLessonsByBatch,
  getBatchLessonProgress,
  toggleLessonProgress,
} from "../api/lessons";
import { getYouTubeEmbedUrl } from "../utils/youtube";

export default function BatchLessons() {
  const { batchId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [progressSaving, setProgressSaving] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [batchId]);

  async function loadLessons() {
    try {
      setLoading(true);
      setError("");

      const [response, progressResponse] = await Promise.all([
        getLessonsByBatch(batchId),
        getBatchLessonProgress(batchId),
      ]);
      const list = Array.isArray(response.data) ? response.data : [];
      setLessons(list);
      setCompletedLessonIds(progressResponse.data?.completedLessonIds || []);

      if (!lessonId && list.length > 0) {
        navigate(`/my-batch/${batchId}/lessons/${list[0]._id}`, {
          replace: true,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load lessons for this batch",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <main className="page learn-page">
          <div className="card card__pad empty-state">Loading lessons…</div>
        </main>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <main className="page learn-page">
          <Link className="back-link" to="/my-batch">
            ← Back to my batch
          </Link>
          <div className="banner banner--error" style={{ marginTop: 16 }}>
            {error}
          </div>
        </main>
      </AppShell>
    );
  }

  if (lessons.length === 0) {
    return (
      <AppShell>
        <main className="page learn-page">
          <Link className="back-link" to="/my-batch">
            ← Back to my batch
          </Link>
          <div className="card card__pad empty-state" style={{ marginTop: 16 }}>
            No lessons have been added to this batch yet.
          </div>
        </main>
      </AppShell>
    );
  }

  const activeIndex = Math.max(
    0,
    lessons.findIndex((l) => l._id === lessonId),
  );
  const activeLesson = lessons[activeIndex];
  const embedUrl = getYouTubeEmbedUrl(activeLesson.videoUrl);
  const prevLesson = lessons[activeIndex - 1];
  const nextLesson = lessons[activeIndex + 1];

  return (
    <AppShell>
      <main className="page learn-page">
        <Link className="back-link" to="/my-batch">
          ← Back to my batch
        </Link>

        {embedUrl ? (
          <div className="video-embed">
            <iframe
              src={embedUrl}
              title={activeLesson.title}
              allow="accelerated-video; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="video-embed video-embed--empty">
            No video added for this lesson yet
          </div>
        )}

        <div className="lesson-layout">
          <section>
            <div className="lesson-title">
              <span className="eyebrow">
                LESSON {activeIndex + 1} OF {lessons.length}
              </span>
              <h1>{activeLesson.title}</h1>
              {activeLesson.description && <p>{activeLesson.description}</p>}
            </div>

            <div className="card card__pad">
              <h2>Lesson details</h2>
              <p>Duration: {activeLesson.duration || "Not specified"}</p>

              <button
                className="hero-btn"
                type="button"
                disabled={progressSaving}
                onClick={async () => {
                  try {
                    setProgressSaving(true);
                    const response = await toggleLessonProgress(
                      activeLesson._id,
                    );
                    setCompletedLessonIds(
                      response.data?.completedLessonIds || [],
                    );
                  } catch (err) {
                    setError(
                      err.response?.data?.message ||
                        "Could not update lesson progress",
                    );
                  } finally {
                    setProgressSaving(false);
                  }
                }}
              >
                {progressSaving
                  ? "Saving…"
                  : completedLessonIds.includes(activeLesson._id)
                    ? "✓ Mark as incomplete"
                    : "Mark lesson complete"}
              </button>

              <div style={{ display: "flex", gap: "12px", marginTop: "18px" }}>
                {prevLesson ? (
                  <Link
                    className="chip"
                    to={`/my-batch/${batchId}/lessons/${prevLesson._id}`}
                  >
                    ← Previous lesson
                  </Link>
                ) : (
                  <span className="chip" style={{ opacity: 0.5 }}>
                    ← Previous lesson
                  </span>
                )}

                {nextLesson ? (
                  <Link
                    className="hero-btn"
                    to={`/my-batch/${batchId}/lessons/${nextLesson._id}`}
                  >
                    Next lesson →
                  </Link>
                ) : (
                  <span className="chip" style={{ opacity: 0.5 }}>
                    Next lesson →
                  </span>
                )}
              </div>
            </div>

          </section>

          <aside className="card lesson-sidebar">
            <h3>Batch lessons</h3>

            {lessons.map((lesson, i) => (
              <Link
                className={`lesson-item ${
                  lesson._id === activeLesson._id ? "active" : ""
                }`}
                key={lesson._id}
                to={`/my-batch/${batchId}/lessons/${lesson._id}`}
              >
                <span>
                  {completedLessonIds.includes(lesson._id)
                    ? "✓"
                    : lesson._id === activeLesson._id
                      ? "▶"
                      : "○"}
                </span>
                <div>
                  <strong>
                    {i + 1}. {lesson.title}
                  </strong>
                  <small>{lesson.duration || "—"}</small>
                </div>
              </Link>
            ))}
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
