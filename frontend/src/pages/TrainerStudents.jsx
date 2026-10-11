import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { getTrainerStudents } from "../api/batches";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TrainerStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudents() {
      try {
        const response = await getTrainerStudents();
        setStudents(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, []);

  return (
    <AppShell>
      <main className="page staff-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">TEACHING SPACE</span>
            <h1>Enrolled students</h1>
            <p>
              View every student in your assigned batches and their current
              status.
            </p>
          </div>
          <div className="page__head-stat">
            <strong>{students.length}</strong>
            <span>students</span>
          </div>
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        {loading ? (
          <div className="card card__pad empty-state">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="card card__pad empty-state">
            No students are enrolled in your assigned batches yet.
          </div>
        ) : (
          <div className="card trainer-students-card">
            <div className="table-wrap">
              <table className="trainer-student-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Mobile</th>
                    <th>Assigned batch</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>
                        <strong>{student.name}</strong>
                        <span className="trainer-student-email">
                          {student.email}
                        </span>
                      </td>
                      <td>{student.mobile || "Not provided"}</td>
                      <td>
                        <div className="trainer-student-batches">
                          {student.batches.map((batch) => (
                            <span key={batch.id}>{batch.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>{formatDate(student.joinedAt)}</td>
                      <td>
                        <span
                          className={`student-status ${student.isActive ? "student-status--active" : "student-status--inactive"}`}
                        >
                          <span className="status-dot" />
                          {student.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
