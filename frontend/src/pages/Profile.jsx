import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import {
  getProfile,
  uploadProfilePicture,
  uploadBackgroundPicture,
  updateProfile,
  updateProfileDetails,
  uploadDocument,
  changeOwnPassword,
} from "../api/auth";
import { getDocumentFile } from "../api/users";
import { INDIA_STATES, INDIA_CITIES } from "../data/indiaLocations";
import { getMyTestResults } from "../api/tests";

const DOCUMENTS = [
  {
    key: "aadhaar",
    label: "Aadhaar Card",
    hint: "Aadhaar number · Image or PDF",
    numberLabel: "Aadhaar number",
    kind: "identity",
    inputMode:"numeric"
  },
  {
    key: "pan",
    label: "PAN Card",
    hint: "PAN number · Image or PDF",
    numberLabel: "PAN number",
    kind: "identity",
    inputMode: "text"
  },
  {
    key: "tenth",
    label: "10th Certificate",
    hint: "Mark sheet / certificate",
    kind: "education",
  },
  {
    key: "twelfth",
    label: "12th Certificate",
    hint: "Mark sheet / certificate",
    kind: "education",
  },
  {
    key: "degree",
    label: "Degree Certificate",
    hint: "UG degree",
    kind: "education",
  },
  {
    key: "postgraduate",
    label: "Postgraduate Certificate",
    hint: "PG degree (if applicable)",
    kind: "education",
  },
];

const blankDocument = () => ({ number: "", fileKey: "", uploadedAt: null });
const emptyProfileDetails = () => ({
  personalInfo: { dateOfBirth: "", gender: "" },
  educationDetails: { qualification: "", institution: "", graduationYear: "" },
  parentDetails: { name: "", relation: "", mobile: "", email: "" },
  addressDetails: {
    street: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
  },
  documents: Object.fromEntries(
    DOCUMENTS.map((doc) => [doc.key, blankDocument()]),
  ),
});

function mergeProfileDetails(value = {}) {
  const base = emptyProfileDetails();
  const docs = Object.fromEntries(
    DOCUMENTS.map((doc) => [
      doc.key,
      { ...base.documents[doc.key], ...(value.documents?.[doc.key] || {}) },
    ]),
  );
  // Keep compatibility with the older two-slot data until users re-upload.
  if (value.documents?.governmentId1 && !docs.aadhaar.fileKey) {
    docs.aadhaar = {
      ...docs.aadhaar,
      number: value.documents.governmentId1.number || "",
      fileKey: value.documents.governmentId1.fileKey || "",
    };
  }
  if (value.documents?.governmentId2 && !docs.pan.fileKey) {
    docs.pan = {
      ...docs.pan,
      number: value.documents.governmentId2.number || "",
      fileKey: value.documents.governmentId2.fileKey || "",
    };
  }
  return {
    ...base,
    ...value,
    personalInfo: { ...base.personalInfo, ...(value.personalInfo || {}) },
    educationDetails: {
      ...base.educationDetails,
      ...(value.educationDetails || {}),
    },
    parentDetails: { ...base.parentDetails, ...(value.parentDetails || {}) },
    addressDetails: { ...base.addressDetails, ...(value.addressDetails || {}) },
    documents: docs,
  };
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [profileDetails, setProfileDetails] = useState(emptyProfileDetails);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [testResultsLoading, setTestResultsLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const profileInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  const isAdmin = profile?.role === "admin";
  const documentCount = DOCUMENTS.length;
  const uploadedCount = useMemo(
    () =>
      DOCUMENTS.filter((doc) => profileDetails.documents?.[doc.key]?.fileKey)
        .length,
    [profileDetails.documents],
  );

  async function loadProfile() {
    try {
      const response = await getProfile();
      const user = response.data;
      setProfile(user);
      setName(user.name || "");
      setMobile(user.mobile || "");
      setAddress(user.address || "");
      setProfileDetails(mergeProfileDetails(user.profileDetails));
    } catch (err) {
      setError(err.response?.data?.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const stateName = profileDetails.addressDetails.state;
    if (!stateName) {
      setCities([]);
      return;
    }
    let active = true;
    setCitiesLoading(true);
    fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: "India", state: stateName }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (active)
          setCities(
            Array.isArray(result.data) && result.data.length
              ? result.data
              : INDIA_CITIES[stateName] || [],
          );
      })
      .catch(() => {
        if (active) setCities(INDIA_CITIES[stateName] || []);
      })
      .finally(() => {
        if (active) setCitiesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileDetails.addressDetails.state]);

  useEffect(() => {
    if (profile?.role !== "user") return;
    setTestResultsLoading(true);
    getMyTestResults()
      .then((response) => setTestResults(response.data || []))
      .catch(() => setTestResults([]))
      .finally(() => setTestResultsLoading(false));
  }, [profile?.role]);

  function updateDetails(section, field, value) {
    setProfileDetails((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  }

  function handleStateChange(event) {
    updateDetails("addressDetails", "state", event.target.value);
    updateDetails("addressDetails", "city", "");
    updateDetails("addressDetails", "pinCode", "");
  }

  function handleCityChange(event) {
    updateDetails("addressDetails", "city", event.target.value);
    updateDetails("addressDetails", "pinCode", "");
  }

  async function saveBasic() {
    const cleanName = name.trim();
    if (!cleanName || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(cleanName)) {
      setError("Name can contain only alphabets and spaces.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const response = await updateProfile({
        name: cleanName,
        email: profile.email,
        mobile,
        address,
      });
      setProfile((current) => ({ ...current, ...response.data }));
      setName(response.data.name || cleanName);
      setMobile(response.data.mobile || mobile);
      setAddress(response.data.address || address);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDetails(event) {
    event.preventDefault();
    if (
      profileDetails.addressDetails.pinCode &&
      !/^\d{6}$/.test(profileDetails.addressDetails.pinCode)
    ) {
      setError("PIN code must contain exactly 6 digits.");
      return;
    }
    try {
      setSavingDetails(true);
      setError("");
      setSuccess("");
      const response = await updateProfileDetails(profileDetails);
      const savedDetails = mergeProfileDetails(response.data.profileDetails);
      setProfileDetails(savedDetails);
      setProfile((current) => ({
        ...current,
        address: savedDetails.addressDetails.street || "",
        profileDetails: response.data.profileDetails,
      }));
      setAddress(savedDetails.addressDetails.street || "");
      setSuccess("Your information was saved.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save your information.",
      );
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleDocumentUpload(event, docKey) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(docKey);
      setError("");
      setSuccess("");
      const number = profileDetails.documents?.[docKey]?.number || "";
      const response = await uploadDocument(docKey, file, number);
      const details = mergeProfileDetails(response.data.profileDetails);
      setProfileDetails(details);
      setProfile((current) => ({ ...current, profileDetails: details }));
      setSuccess(
        `${DOCUMENTS.find((doc) => doc.key === docKey)?.label || "Document"} uploaded successfully.`,
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not upload this document.",
      );
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function viewDocument(docKey) {
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("Allow pop-ups to view the document.");
      return;
    }
    try {
      const file = await getDocumentFile(profile._id || profile.id, docKey);
      const url = URL.createObjectURL(file);
      popup.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      popup.close();
      setError(err.response?.data?.message || "Could not open the document.");
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setError(
        "New password must be 8+ characters with uppercase, lowercase and a special character.",
      );
      return;
    }
    try {
      setPasswordSaving(true);
      setError("");
      setSuccess("");
      await changeOwnPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not change your password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handlePictureUpload(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(type);
      setError("");
      setSuccess("");
      if (type === "profile") await uploadProfilePicture(file);
      else await uploadBackgroundPicture(file);
      await loadProfile();
      setSuccess(
        type === "profile" ? "Profile photo updated." : "Cover updated.",
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload image.");
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  if (loading)
    return (
      <AppShell>
        <main className="page">
          <div className="card card__pad empty-state">Loading profile…</div>
        </main>
      </AppShell>
    );

  const firstLetter = (profile?.name || "U")[0].toUpperCase();
  const addressDetails = profileDetails.addressDetails;

  return (
    <AppShell>
      <main className="page">
        <div className="page__head">
          <div>
            <span className="eyebrow">ACCOUNT</span>
            <h1>Your profile</h1>
            <p>Manage your account information, security and documents.</p>
          </div>
        </div>
        {error && <div className="banner banner--error">{error}</div>}
        {success && <div className="banner banner--success">{success}</div>}

        <section className="profile-shell card">
          <div className="profile-cover">
            {profile?.backgroundPicture && (
              <img
                src={`http://localhost:5000${profile.backgroundPicture}`}
                alt="Profile cover"
                className="profile-cover__image"
              />
            )}
            <input
              ref={backgroundInputRef}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handlePictureUpload(e, "background")}
            />
            <button
              className="profile-cover__button"
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
            >
              {uploading === "background" ? "Uploading…" : "Change cover"}
            </button>
          </div>
          <div className="profile-shell__identity">
            <div className="profile-identity__photo">
              <div className="profile-avatar">
                {profile?.profilePicture ? (
                  <img
                    src={`http://localhost:5000${profile.profilePicture}`}
                    alt={profile.name}
                    className="profile-avatar__image"
                  />
                ) : (
                  firstLetter
                )}
              </div>
              <input
                ref={profileInputRef}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handlePictureUpload(e, "profile")}
              />
              <button
                className="profile-avatar__button"
                type="button"
                onClick={() => profileInputRef.current?.click()}
              >
                Change photo
              </button>
            </div>
            <div className="profile-identity__details">
              <h2>{profile?.name}</h2>
              <p>{profile?.email}</p>
              <span className="profile-role-badge">
                {isAdmin
                  ? "Administrator"
                  : profile?.role === "trainer"
                    ? "Trainer"
                    : "Student"}
              </span>
            </div>
          </div>

          <div className="profile-tabs" role="tablist">
            <button
              className={tab === "profile" ? "is-active" : ""}
              onClick={() => setTab("profile")}
            >
              ⌂ Profile
            </button>
            <button
              className={tab === "password" ? "is-active" : ""}
              onClick={() => setTab("password")}
            >
              ▣ Password
            </button>
            {!isAdmin && (
              <button
                className={tab === "documents" ? "is-active" : ""}
                onClick={() => setTab("documents")}
              >
                ▱ Documents
              </button>
            )}
            {profile?.role === "user" && (
              <button
                className={tab === "test-results" ? "is-active" : ""}
                onClick={() => setTab("test-results")}
              >
                Test marks
              </button>
            )}
            <button
              className={tab === "activity" ? "is-active" : ""}
              onClick={() => setTab("activity")}
            >
              ▥ Activity
            </button>
          </div>

          {tab === "profile" && (
            <>
              <section className="profile-section-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">BASIC INFORMATION</span>
                    <h2>Basic Information</h2>
                    <p>Update your name and contact number.</p>
                  </div>
                  <button
                    className="hero-btn"
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                  >
                    {editing ? "Cancel" : "Edit"}
                  </button>
                </div>
                <div className="form-grid profile-basic-grid">
                  <label className="field-label">
                    Full Name <span className="required-star">*</span>
                    <input
                      className="form-input"
                      value={name}
                      readOnly={!editing}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Email Address{" "}
                    <span className="field-help">(read-only)</span>
                    <input
                      className="form-input"
                      value={profile?.email || ""}
                      readOnly
                      disabled
                    />
                  </label>
                  <label className="field-label">
                    Phone Number <span className="required-star">*</span>
                    <input
                      className="form-input"
                      value={mobile}
                      readOnly={!editing}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Address
                    <input
                      className="form-input"
                      value={address}
                      readOnly={!editing}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>
                </div>
                {editing && (
                  <div className="profile-edit-actions">
                    <button
                      className="profile-cancel-button"
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setName(profile.name || "");
                        setMobile(profile.mobile || "");
                        setAddress(profile.address || "");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="profile-edit-button"
                      type="button"
                      onClick={saveBasic}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                )}
              </section>

              {!isAdmin && (
                <form onSubmit={saveDetails}>
                  <section className="profile-section-card">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">YOUR INFORMATION</span>
                        <h2>Personal Information</h2>
                        <p>Keep your learner or trainer profile complete.</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      <label className="field-label">
                        Date of birth
                        <input
                          className="form-input"
                          type="date"
                          value={profileDetails.personalInfo.dateOfBirth}
                          onChange={(e) =>
                            updateDetails(
                              "personalInfo",
                              "dateOfBirth",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        Gender
                        <input
                          className="form-input"
                          value={profileDetails.personalInfo.gender}
                          onChange={(e) =>
                            updateDetails(
                              "personalInfo",
                              "gender",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  </section>
                  <section className="profile-section-card">
                    <div className="section-heading">
                      <div>
                        <h2>Education & Qualification</h2>
                        <p>Academic background and qualification.</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      <label className="field-label">
                        Highest qualification
                        <input
                          className="form-input"
                          value={profileDetails.educationDetails.qualification}
                          onChange={(e) =>
                            updateDetails(
                              "educationDetails",
                              "qualification",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        School / College
                        <input
                          className="form-input"
                          value={profileDetails.educationDetails.institution}
                          onChange={(e) =>
                            updateDetails(
                              "educationDetails",
                              "institution",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        Graduation year
                        <input
                          className="form-input"
                          value={profileDetails.educationDetails.graduationYear}
                          onChange={(e) =>
                            updateDetails(
                              "educationDetails",
                              "graduationYear",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  </section>
                  <section className="profile-section-card">
                    <div className="section-heading">
                      <div>
                        <h2>Parent / Guardian</h2>
                        <p>Optional emergency or guardian contact.</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      <label className="field-label">
                        Name
                        <input
                          className="form-input"
                          value={profileDetails.parentDetails.name}
                          onChange={(e) =>
                            updateDetails(
                              "parentDetails",
                              "name",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        Relationship
                        <input
                          className="form-input"
                          value={profileDetails.parentDetails.relation}
                          onChange={(e) =>
                            updateDetails(
                              "parentDetails",
                              "relation",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        Mobile
                        <input
                          className="form-input"
                          value={profileDetails.parentDetails.mobile}
                          onChange={(e) =>
                            updateDetails(
                              "parentDetails",
                              "mobile",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        Email
                        <input
                          className="form-input"
                          type="email"
                          value={profileDetails.parentDetails.email}
                          onChange={(e) =>
                            updateDetails(
                              "parentDetails",
                              "email",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  </section>
                  <section className="profile-section-card">
                    <div className="section-heading">
                      <div>
                        <h2>Address Details</h2>
                        <p>Your current address information.</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      <label className="field-label field-label--wide">
                        Street / Address
                        <input
                          className="form-input"
                          value={addressDetails.street}
                          onChange={(e) =>
                            updateDetails(
                              "addressDetails",
                              "street",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        State
                        <select
                          className="form-input"
                          value={addressDetails.state}
                          onChange={handleStateChange}
                        >
                          <option value="">Select state</option>
                          {INDIA_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-label">
                        City
                        <select
                          className="form-input"
                          value={addressDetails.city}
                          onChange={handleCityChange}
                          disabled={!addressDetails.state || citiesLoading}
                        >
                          <option value="">
                            {citiesLoading ? "Loading cities…" : "Select city"}
                          </option>
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-label">
                        PIN code
                        <input
                          className="form-input"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="PIN code"
                          value={addressDetails.pinCode}
                          onChange={(e) =>
                            updateDetails(
                              "addressDetails",
                              "pinCode",
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                        />
                      </label>
                    </div>
                  </section>
                  <div className="profile-save-bar">
                    <button
                      className="hero-btn"
                      type="submit"
                      disabled={savingDetails}
                    >
                      {savingDetails ? "Saving…" : "Save information"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {tab === "documents" && !isAdmin && (
            <section className="documents-panel">
              <div className="documents-summary">
                <div>
                  <span className="eyebrow">DOCUMENTS</span>
                  <h2>Documents</h2>
                  <p>
                    {uploadedCount} of {documentCount} uploaded
                  </p>
                </div>
                <div className="document-summary-badges">
                  <span className="document-badge document-badge--done">
                    ✓ {uploadedCount} done
                  </span>
                  <span className="document-badge document-badge--pending">
                    ⌛ {documentCount - uploadedCount} pending
                  </span>
                </div>
              </div>
              <div className="document-progress">
                <i
                  style={{
                    width: `${Math.round((uploadedCount / documentCount) * 100)}%`,
                  }}
                />
              </div>
              <div className="document-progress-label">
                Click + Add on any pending document{" "}
                <strong>
                  {Math.round((uploadedCount / documentCount) * 100)}%
                </strong>
              </div>
              <div className="document-list">
                {DOCUMENTS.map((doc) => {
                  const value =
                    profileDetails.documents?.[doc.key] || blankDocument();
                  const uploaded = Boolean(value.fileKey);
                  return (
                    <article
                      className={`document-card ${uploaded ? "document-card--uploaded" : ""}`}
                      key={doc.key}
                    >
                      <div className="document-icon">
                        {doc.kind === "identity" ? "▢" : "◇"}
                      </div>
                      <div className="document-copy">
                        <h3>{doc.label}</h3>
                        <p>{doc.hint}</p>
                        {doc.kind === "identity" && (
                          <input
                            className="form-input document-number"
                            placeholder={doc.numberLabel}
                            value={value.number || ""}
                            inputMode={doc.inputMode}
                            maxLength={doc.key === "aadhaar" ? 12 : undefined}
                            onChange={(e) =>
                              setProfileDetails((current) => ({
                                ...current,
                                documents: {
                                  ...current.documents,
                                  [doc.key]: {
                                    ...current.documents[doc.key],
                                    number:
                                      doc.key === "aadhaar"
                                        ? e.target.value.replace(/\D/g, "").slice(0, 12)
                                        : e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="document-actions">
                        <span
                          className={`document-status ${uploaded ? "document-status--verified" : "document-status--pending"}`}
                        >
                          {uploaded ? "✓ Verified" : "Pending"}
                        </span>
                        {uploaded ? (
                          <button
                            className="chip"
                            type="button"
                            onClick={() => viewDocument(doc.key)}
                          >
                            View
                          </button>
                        ) : (
                          <label className="chip chip--primary">
                            + Add
                            <input
                              hidden
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              onChange={(e) => handleDocumentUpload(e, doc.key)}
                            />
                          </label>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {tab === "password" && (
            <form
              className="profile-section-card password-section"
              onSubmit={changePassword}
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ACCOUNT SECURITY</span>
                  <h2>Change password</h2>
                  <p>Use a strong password you do not reuse elsewhere.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field-label">
                  Current password
                  <input
                    className="form-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="field-label">
                  New password
                  <input
                    className="form-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="field-label">
                  Confirm password
                  <input
                    className="form-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </label>
              </div>
              <button
                className="hero-btn"
                type="submit"
                disabled={passwordSaving}
              >
                {passwordSaving ? "Updating…" : "Change password"}
              </button>
            </form>
          )}

          {tab === "activity" && (
            <section className="profile-section-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ACTIVITY</span>
                  <h2>Account activity</h2>
                  <p>
                    Account created on{" "}
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )
                      : "—"}
                    .
                  </p>
                </div>
              </div>
              <div className="activity-row">
                <span>Account status</span>
                <strong>
                  {profile?.isActive === false ? "Inactive" : "Active"}
                </strong>
              </div>
              <div className="activity-row">
                <span>Email verification</span>
                <strong>
                  {profile?.isEmailVerified ? "Verified" : "Pending"}
                </strong>
              </div>
            </section>
          )}
          {tab === "test-results" && profile?.role === "user" && (
            <section className="profile-section-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ASSESSMENTS</span>
                  <h2>Test marks</h2>
                  <p>Your test scores and evaluation.</p>
                </div>
              </div>
              {testResultsLoading ? (
                <p className="muted">Loading results…</p>
              ) : testResults.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Batch</th>
                        <th>Score</th>
                        <th>Percentage</th>
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
                <p className="muted">No test results yet.</p>
              )}
            </section>
          )}
        </section>
      </main>
    </AppShell>
  );
}
