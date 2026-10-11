import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import AttendanceCalendar from "../components/AttendanceCalendar";
import {
  getTrainerStudentDetails,
  saveStudentAttendance,
} from "../api/batches";
import { getDocumentFile, getGovernmentIdFile } from "../api/users";
import { getStudentTestResults } from "../api/tests";

function dateLabel(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

function documentsFor(student) {
  return Object.entries(student.profileDetails?.documents || {}).filter(
    ([, doc]) => doc?.fileKey || doc?.fileUrl,
  );
}

async function openDocument(student, key) {
  const file = ["governmentId1", "governmentId2"].includes(key)
    ? await getGovernmentIdFile(student._id, key)
    : await getDocumentFile(student._id, key);
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function TrainerStudentDetails() {
  const { batchId, studentId } = useParams();
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState([]);

  const load = useCallback(async () => {
    const response = await getTrainerStudentDetails(batchId, studentId);
    setDetails(response.data);
  }, [batchId, studentId]);

  useEffect(() => {
    load()
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Could not load student details",
        ),
      )
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    getStudentTestResults(studentId)
      .then((response) => setTestResults(response.data || []))
      .catch(() => setTestResults([]));
  }, [studentId]);

  async function markAttendance(date, status) {
    await saveStudentAttendance(batchId, studentId, date, status);
    await load();
  }

  if (loading)
    return (
      <AppShell>
        <main className="page">
          <div className="card card__pad empty-state">
            Loading student details…
          </div>
        </main>
      </AppShell>
    );
  if (error || !details)
    return (
      <AppShell>
        <main className="page">
          <div className="banner banner--error">
            {error || "Student not found"}
          </div>
        </main>
      </AppShell>
    );

  const { student, batch, attendance } = details;
  const personal = student.profileDetails?.personalInfo || {};
  const education = student.profileDetails?.educationDetails || {};
  const parent = student.profileDetails?.parentDetails || {};
  const address = student.profileDetails?.addressDetails || {};
  const fullAddress = [
    student.address,
    address.street,
    address.city,
    address.state,
    address.pinCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell>
      <main className="page trainer-student-details-page">
        <Link className="back-link" to={`/trainer/batches/${batchId}`}>
          ← Back to {batch.batchName}
        </Link>
        <section className="card trainer-student-profile-hero">
          <div className="trainer-detail-avatar">
            {(student.name || "S").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span className="eyebrow">STUDENT PROFILE</span>
            <h1>{student.name}</h1>
            <p>
              {student.email} · {student.mobile || "No mobile number"}
            </p>
          </div>
          <div className="trainer-detail-joined">
            Batch joined<strong>{dateLabel(attendance.joinedAt)}</strong>
          </div>
        </section>
        <section className="card trainer-student-profile-card">
          <h2>Personal details</h2>
          <div className="trainer-student-profile-grid">
            {[
              ["Email", student.email],
              ["Mobile", student.mobile],
              ["Address", fullAddress],
              ["Date of birth", personal.dateOfBirth],
              ["Gender", personal.gender],
              ["Qualification", education.qualification],
              ["Institution", education.institution],
              ["Graduation year", education.graduationYear],
              ["Parent / guardian", parent.name],
              ["Parent mobile", parent.mobile],
              ["Parent email", parent.email],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value || "Not provided"}</strong>
              </div>
            ))}
          </div>
          <h3>Uploaded documents</h3>
          {documentsFor(student).length ? (
            <div className="trainer-student-documents">
              {documentsFor(student).map(([key, doc]) => (
                <button
                  type="button"
                  className="chip"
                  key={key}
                  onClick={() =>
                    openDocument(student, key).catch(() =>
                      window.alert("Could not open this document."),
                    )
                  }
                >
                  {key} · {dateLabel(doc.uploadedAt)} ↗
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">No documents uploaded.</p>
          )}
        </section>
        <section className="trainer-student-attendance-page">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ATTENDANCE</span>
              <h2>Attendance calendar</h2>
              <p>
                Mark attendance for this student. Dates before joining are
                disabled.
              </p>
            </div>
          </div>
          <AttendanceCalendar
            records={attendance.records}
            joinedAt={attendance.joinedAt}
            editable
            onMark={markAttendance}
          />
        </section>
        <section className="card trainer-student-profile-card">
          <h2>Test performance</h2>
          {testResults.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Evaluation</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults
                    .filter(
                      (item) =>
                        !item.test?.batch?._id ||
                        item.test.batch._id === batchId,
                    )
                    .map((item) => (
                      <tr key={item._id}>
                        <td>{item.test?.title || "Test"}</td>
                        <td>
                          {item.isGraded
                            ? `${item.score ?? 0} / ${item.test?.totalMarks ?? "—"}`
                            : "Pending"}
                        </td>
                        <td>
                          {item.isGraded ? `${item.percentage ?? 0}%` : "—"}
                        </td>
                        <td>{item.evaluation || "Awaiting evaluation"}</td>
                        <td>{item.feedback || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No test attempts yet.</p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
