import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getPublishedCourses } from "../api/courses";
import { getMyEnrollments } from "../api/enrollments";

const ICONS = ["🌐", "✦", "JS", "⚛", "Py", "◆", "▣", "☰"];

function iconFor(index) {
  return ICONS[index % ICONS.length];
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All courses");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [coursesRes, enrollRes] = await Promise.all([
        getPublishedCourses(),
        getMyEnrollments().catch(() => ({ data: [] })),
      ]);

      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);

      const ids = new Set(
        (enrollRes.data || []).map((e) => e.course?._id).filter(Boolean),
      );
      setEnrolledIds(ids);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(courses.map((c) => c.category).filter(Boolean));
    return ["All courses", ...Array.from(unique)];
  }, [courses]);

  const filteredCourses = courses.filter((course) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      course.title?.toLowerCase().includes(query) ||
      course.category?.toLowerCase().includes(query) ||
      course.instructor?.toLowerCase().includes(query);

    const matchesCategory =
      activeCategory === "All courses" || course.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <AppShell>
      <main className="page">
        <section className="catalog-head">
          <div>
            <span className="eyebrow">LEARN SOMETHING NEW</span>

            <h1>Explore courses</h1>

            <p>Practical skills. Expert instructors. Learn at your pace.</p>
          </div>

          <div className="search-box">
            ⌕
            <input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <div className="chips">
          {categories.map((category) => (
            <button
              className={`chip ${activeCategory === category ? "active" : ""}`}
              key={category}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        {loading ? (
          <div className="card card__pad empty-state">Loading courses…</div>
        ) : filteredCourses.length === 0 ? (
          <div className="card card__pad empty-state">No courses found.</div>
        ) : (
          <div className="course-grid course-grid--catalog">
            {filteredCourses.map((course, index) => (
              <Link
                className="course-card"
                to={`/courses/${course._id}`}
                key={course._id}
              >
                <div
                  className={`course-cover course-cover--${(index % 3) + 1}`}
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
                  {!course.thumbnail && <span>{iconFor(index)}</span>}
                  <small>{course.category}</small>
                </div>

                <div className="course-card__body">
                  <h3>{course.title}</h3>

                  <div className="course-meta">
                    <span>{course.lessonsCount || 0} lessons</span>
                    <span>{course.duration || "Self paced"}</span>
                  </div>

                  <div className="rating">
                    ★ {course.rating || 4.5}
                    <span>•</span>
                    {course.level || "Beginner"} friendly
                  </div>

                  {enrolledIds.has(course._id) ? (
                    <div className="course-price">
                      <span className="pill pill--green">Enrolled</span>
                    </div>
                  ) : (
                    <div className="course-price">
                      {course.price > 0 ? `₹${course.price}` : "Free"}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
