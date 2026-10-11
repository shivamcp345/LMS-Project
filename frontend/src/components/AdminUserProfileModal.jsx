import { useEffect, useState } from "react";
import {
  getDocumentFile,
  updateUserDocument,
  updateUserProfile,
} from "../api/users";
import { getStudentTestResults } from "../api/tests";
import { getAdminStudentReport } from "../api/batches";
import AttendanceCalendar from "./AttendanceCalendar";

const documents = [
  { key: "aadhaar", label: "Aadhaar card", numberLabel: "Aadhaar number" },
  { key: "pan", label: "PAN card", numberLabel: "PAN number" },
  { key: "tenth", label: "10th certificate" },
  { key: "twelfth", label: "12th certificate" },
  { key: "degree", label: "Degree certificate" },
  { key: "postgraduate", label: "Postgraduate certificate" },
];

const editSections = [
  {
    title: "Personal information",
    key: "personalInfo",
    fields: [
      { key: "dateOfBirth", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender" },
    ],
  },
  {
    title: "Education & qualification",
    key: "educationDetails",
    fields: [
      { key: "qualification", label: "Highest qualification" },
      { key: "institution", label: "School / college" },
      { key: "graduationYear", label: "Graduation year" },
    ],
  },
  {
    title: "Parent / guardian",
    key: "parentDetails",
    fields: [
      { key: "name", label: "Name" },
      { key: "relation", label: "Relationship" },
      { key: "mobile", label: "Mobile" },
      { key: "email", label: "Email", type: "email" },
    ],
  },
  {
    title: "Address",
    key: "addressDetails",
    fields: [
      { key: "street", label: "Street / address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "pinCode", label: "PIN code", maxLength: 6 },
      { key: "country", label: "Country" },
    ],
  },
];

const viewSections = [
  {
    title: "Personal information",
    key: "personalInfo",
    fields: [
      ["dateOfBirth", "Date of birth"],
      ["gender", "Gender"],
    ],
  },
  {
    title: "Education",
    key: "educationDetails",
    fields: [
      ["qualification", "Qualification"],
      ["institution", "Institution"],
      ["graduationYear", "Graduation year"],
    ],
  },
  {
    title: "Parent / guardian",
    key: "parentDetails",
    fields: [
      ["name", "Name"],
      ["relation", "Relationship"],
      ["mobile", "Mobile"],
      ["email", "Email"],
    ],
  },
  {
    title: "Address",
    key: "addressDetails",
    fields: [
      ["street", "Street"],
      ["city", "City"],
      ["state", "State"],
      ["pinCode", "PIN code"],
      ["country", "Country"],
    ],
  },
];

function makeForm(user) {
  const profile = user.profileDetails || {};
  return {
    name: user.name || "",
    mobile: user.mobile || "",
    personalInfo: { dateOfBirth: "", gender: "", ...profile.personalInfo },
    educationDetails: {
      qualification: "",
      institution: "",
      graduationYear: "",
      ...profile.educationDetails,
    },
    parentDetails: {
      name: "",
      relation: "",
      mobile: "",
      email: "",
      ...profile.parentDetails,
    },
    addressDetails: {
      street: user.address || "",
      city: "",
      state: "",
      pinCode: "",
      country: "India",
      ...profile.addressDetails,
    },
    documents: Object.fromEntries(
      documents.map(({ key }) => [
        key,
        { number: "", fileKey: "", ...profile.documents?.[key] },
      ]),
    ),
  };
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="field-label">
      {label}
      <input
        className="form-input"
        value={value}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <p>
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </p>
  );
}

export default function AdminUserProfileModal({
  user,
  roleLabel,
  onClose,
  onUpdated,
  onToggle,
  onRemove,
}) {
  const [form, setForm] = useState(() => makeForm(user));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [studentReport, setStudentReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const id = user._id || user.id;
  const profile = user.profileDetails || {};

  useEffect(() => {
    if (user.role !== "user") return;
    setReportLoading(true);
    Promise.allSettled([getStudentTestResults(id), getAdminStudentReport(id)])
      .then(([tests, report]) => {
        setTestResults(
          tests.status === "fulfilled" ? tests.value.data || [] : [],
        );
        setStudentReport(
          report.status === "fulfilled" ? report.value.data : { batches: [] },
        );
      })
      .finally(() => setReportLoading(false));
  }, [id, user.role]);

  function changeField(section, field, value) {
    setForm((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await updateUserProfile(id, {
        name: form.name.trim(),
        mobile: form.mobile,
        address: form.addressDetails.street,
        profileDetails: {
          personalInfo: form.personalInfo,
          educationDetails: form.educationDetails,
          parentDetails: form.parentDetails,
          addressDetails: form.addressDetails,
          documents: {
            aadhaar: { number: form.documents.aadhaar.number },
            pan: { number: form.documents.pan.number },
          },
        },
      });
      setForm(makeForm(data.data));
      onUpdated(data.data);
      setEditing(false);
      setSuccess("Details saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save details.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(event, key) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(key);
    setError("");
    try {
      const { data } = await updateUserDocument(
        id,
        key,
        file,
        form.documents[key].number,
      );
      setForm(makeForm(data.data));
      onUpdated(data.data);
      setSuccess("Document uploaded.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload document.");
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function viewDocument(key) {
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("Allow pop-ups to view this document.");
      return;
    }
    try {
      const file = await getDocumentFile(id, key);
      popup.location.href = URL.createObjectURL(file);
    } catch (err) {
      popup.close();
      setError(err.response?.data?.message || "Could not open document.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="card card__pad modal-card modal-card--wide admin-user-modal"
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className="user-detail-modal__header">
          <div className="user-card__avatar">
            {(user.name || roleLabel)[0].toUpperCase()}
          </div>
          <div>
            <span className="eyebrow">{roleLabel.toUpperCase()} PROFILE</span>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <span
            className={`pill ${user.isActive === false ? "pill--red" : "pill--green"}`}
          >
            <i aria-hidden="true" />
            {user.isActive === false ? "Inactive" : "Active"}
          </span>
        </div>
        {error && <div className="banner banner--error">{error}</div>}
        {success && <div className="banner banner--success">{success}</div>}

        {editing ? (
          <form className="admin-user-edit-form" onSubmit={save}>
            <section className="user-detail-section">
              <h3>Basic information</h3>
              <div className="form-grid">
                <Input
                  label="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label="Email (read-only)"
                  value={user.email}
                  disabled
                  readOnly
                />
                <Input
                  label="Mobile"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </div>
            </section>
            {editSections.map((section) => (
              <section className="user-detail-section" key={section.key}>
                <h3>{section.title}</h3>
                <div className="form-grid">
                  {section.fields.map((field) => (
                    <Input
                      key={field.key}
                      label={field.label}
                      type={field.type || "text"}
                      value={form[section.key][field.key]}
                      maxLength={field.maxLength}
                      onChange={(e) =>
                        changeField(section.key, field.key, e.target.value)
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
            <section className="user-detail-section">
              <h3>Documents</h3>
              <div className="admin-user-documents">
                {documents.map(({ key, label, numberLabel }) => {
                  const uploaded = Boolean(form.documents[key].fileKey);
                  return (
                    <div className="admin-user-document" key={key}>
                      <div>
                        <strong>{label}</strong>
                        {numberLabel && (
                          <Input
                            label={numberLabel}
                            value={form.documents[key].number}
                            maxLength={key === "aadhaar" ? 12 : undefined}
                            inputMode={key === "aadhaar" ? "numeric" : "text"}
                            onChange={(e) =>
                              changeField("documents", key, {
                                ...form.documents[key],
                                number:
                                  key === "aadhaar"
                                    ? e.target.value.replace(/\D/g, "").slice(0, 12)
                                    : e.target.value,
                              })
                            }
                          />
                        )}
                        <span
                          className={`document-status ${uploaded ? "document-status--verified" : "document-status--pending"}`}
                        >
                          {uploaded ? "Uploaded" : "Not uploaded"}
                        </span>
                      </div>
                      <div className="document-actions">
                        {uploaded && (
                          <button
                            className="chip"
                            type="button"
                            onClick={() => viewDocument(key)}
                          >
                            View
                          </button>
                        )}
                        <label className="chip chip--primary">
                          {uploading === key
                            ? "Uploading…"
                            : uploaded
                              ? "Replace"
                              : "Add"}
                          <input
                            hidden
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={(e) => uploadDocument(e, key)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="modal-actions">
              <button
                className="profile-cancel-button"
                type="button"
                onClick={() => {
                  setForm(makeForm(user));
                  setEditing(false);
                }}
              >
                Cancel
              </button>
              <button className="hero-btn" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save details"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="user-detail-grid">
              <section className="user-detail-section">
                <h3>Basic information</h3>
                <Detail label="Email" value={user.email} />
                <Detail label="Mobile" value={user.mobile} />
                <Detail
                  label="Joined"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-IN")
                      : ""
                  }
                />
              </section>
              {viewSections.map((section) => (
                <section className="user-detail-section" key={section.key}>
                  <h3>{section.title}</h3>
                  {section.fields.map(([key, label]) => (
                    <Detail
                      key={key}
                      label={label}
                      value={
                        section.key === "addressDetails" && key === "street"
                          ? profile.addressDetails?.street || user.address
                          : profile[section.key]?.[key]
                      }
                    />
                  ))}
                </section>
              ))}
              <section className="user-detail-section">
                <h3>Documents</h3>
                {documents.map(({ key, label }) => (
                  <div className="admin-view-document-row" key={key}>
                    <Detail
                      label={label}
                      value={
                        profile.documents?.[key]?.fileKey
                          ? "Uploaded"
                          : "Not uploaded"
                      }
                    />
                    {profile.documents?.[key]?.fileKey && (
                      <button
                        className="chip"
                        type="button"
                        onClick={() => viewDocument(key)}
                      >
                        View file
                      </button>
                    )}
                  </div>
                ))}
              </section>
              {user.role === "user" && (
                <section className="user-detail-section admin-student-attendance">
                  <h3>Batch and attendance report</h3>
                  {reportLoading ? (
                    <p className="muted">
                      Loading batch and attendance details…
                    </p>
                  ) : studentReport?.batches?.length ? (
                    studentReport.batches.map(
                      ({ batch, joinedAt, attendance }) => (
                        <article
                          className="admin-student-batch-report"
                          key={batch._id}
                        >
                          <div className="admin-student-batch-heading">
                            <div>
                              <h4>{batch.batchName}</h4>
                              <span>
                                {batch.course?.title || "Course"} ·{" "}
                                {batch.trainer?.name || "Trainer not assigned"}
                              </span>
                            </div>
                            <span className="pill">
                              {batch.status || "Active"}
                            </span>
                          </div>
                          <div className="admin-student-batch-meta">
                            <Detail
                              label="Batch start"
                              value={
                                batch.startDate
                                  ? new Date(
                                      batch.startDate,
                                    ).toLocaleDateString("en-IN")
                                  : "Not set"
                              }
                            />
                            <Detail
                              label="Joined batch"
                              value={
                                joinedAt
                                  ? new Date(joinedAt).toLocaleDateString(
                                      "en-IN",
                                    )
                                  : "Not available"
                              }
                            />
                            <Detail
                              label="Batch end"
                              value={
                                batch.endDate
                                  ? new Date(batch.endDate).toLocaleDateString(
                                      "en-IN",
                                    )
                                  : "Not set"
                              }
                            />
                          </div>
                          <AttendanceCalendar
                            records={attendance || []}
                            joinedAt={joinedAt}
                          />
                        </article>
                      ),
                    )
                  ) : (
                    <p className="muted">
                      No batch enrollments found for this student.
                    </p>
                  )}
                </section>
              )}
              {user.role === "user" && (
                <section className="user-detail-section admin-test-results">
                  <h3>Test performance</h3>
                  {reportLoading ? (
                    <p className="muted">Loading test results…</p>
                  ) : testResults.length ? (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Batch</th>
                            <th>Score</th>
                            <th>Percent</th>
                            <th>Correct / wrong</th>
                            <th>Evaluation</th>
                            <th>Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testResults.map((item) => (
                            <tr key={item._id}>
                              <td>{item.test?.title || "Test"}</td>
                              <td>{item.test?.batch?.batchName || "—"}</td>
                              <td>
                                {item.isGraded
                                  ? `${item.score ?? 0} / ${item.test?.totalMarks ?? "—"}`
                                  : "Pending"}
                              </td>
                              <td>
                                {item.isGraded
                                  ? `${item.percentage ?? 0}%`
                                  : "—"}
                              </td>
                              <td>
                                {!item.isGraded
                                  ? "Pending"
                                  : item.test?.format === "mcq"
                                    ? `${item.correctCount ?? 0} / ${item.wrongCount ?? 0}`
                                    : "Manual grade"}
                              </td>
                              <td>
                                {item.evaluation || "Awaiting evaluation"}
                              </td>
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
              )}
            </div>
            <div className="admin-user-modal__actions">
              <button
                className="table-action"
                type="button"
                onClick={() => setEditing(true)}
              >
                Edit details
              </button>
              <button className="table-action" type="button" onClick={onToggle}>
                {user.isActive === false
                  ? "Activate account"
                  : "Deactivate account"}
              </button>
              <button
                className="table-action danger"
                type="button"
                onClick={onRemove}
              >
                Remove
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
