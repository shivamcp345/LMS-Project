import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import AdminUserProfileModal from "../components/AdminUserProfileModal";
import FormField from "../components/FormField";
import { listUsers, addUser, removeUser, toggleUserStatus } from "../api/users";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const data = await listUsers();
      const students = (Array.isArray(data) ? data : []).filter(
        (user) => user.role === "user",
      );
      setUsers(students);
      return students;
    } catch (err) {
      setError(err.response?.data?.message || "Could not load students.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;
    listUsers()
      .then((data) => {
        if (isCurrent)
          setUsers(
            (Array.isArray(data) ? data : []).filter(
              (user) => user.role === "user",
            ),
          );
      })
      .catch((err) => {
        if (isCurrent)
          setError(err.response?.data?.message || "Could not load students.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const filtered = users.filter((user) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  async function createStudent(event) {
    event.preventDefault();
    try {
      setBusy(true);
      setError("");
      await addUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: "user",
      });
      setSuccess("Student created successfully.");
      setShowAdd(false);
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create student.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user) {
    try {
      setError("");
      await toggleUserStatus(user._id || user.id);
      const refreshed = await load();
      setSelectedUser(
        refreshed.find(
          (item) => (item._id || item.id) === (user._id || user.id),
        ) || null,
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not update student status.",
      );
    }
  }

  async function remove() {
    if (!deleteUser) return;
    try {
      setBusy(true);
      await removeUser(deleteUser._id || deleteUser.id);
      setDeleteUser(null);
      setSuccess("Student removed successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove student.");
    } finally {
      setBusy(false);
    }
  }

  function updateSelectedUser(updated) {
    setSelectedUser(updated);
    setUsers((current) =>
      current.map((user) =>
        (user._id || user.id) === (updated._id || updated.id) ? updated : user,
      ),
    );
  }

  return (
    <AppShell>
      <main className="page staff-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">PEOPLE</span>
            <h1>Manage users</h1>
            <p>Manage enrolled students. Trainers are managed separately.</p>
          </div>
          <button
            className="hero-btn"
            type="button"
            onClick={() => {
              setShowAdd(true);
              setError("");
            }}
          >
            ＋ Add student
          </button>
        </div>
        {error && <div className="banner banner--error">{error}</div>}
        {success && <div className="banner banner--success">{success}</div>}
        <section className="card admin-user-list">
          <div className="table-toolbar table-toolbar--fancy">
            <div className="search-box">
              ⌕
              <input
                aria-label="Search students"
                placeholder="Search students"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <span className="table-count">{filtered.length} students</span>
          </div>
          {loading ? (
            <div className="card__pad empty-state">Loading students…</div>
          ) : !filtered.length ? (
            <div className="card__pad empty-state">
              No students match your search.
            </div>
          ) : (
            <div className="users-grid users-grid--students">
              {filtered.map((user) => {
                const id = user._id || user.id;
                return (
                  <article
                    className="user-card user-card--student user-card--compact"
                    key={id}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${user.name || "student"} profile`}
                    onClick={() => setSelectedUser(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedUser(user);
                      }
                    }}
                  >
                    <div className="user-card__top">
                      <div className="user-card__identity">
                        <div className="user-card__avatar">
                          {(user.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 title={user.name}>
                            {user.name || "Unknown student"}
                          </h3>
                          <p title={user.email}>{user.email}</p>
                        </div>
                      </div>
                      <span
                        className={`pill ${user.isActive === false ? "pill--red" : "pill--green"}`}
                      >
                        <i aria-hidden="true" />
                        {user.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {showAdd && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card card__pad modal-card modal-card--wide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-student-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
              <h2 id="add-student-title">Add student</h2>
              <form onSubmit={createStudent}>
                <div className="form-grid">
                  <FormField
                    label="Full name *"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                  <FormField
                    label="Email *"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <FormField
                    label="Password *"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    className="profile-cancel-button"
                    type="button"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </button>
                  <button className="hero-btn" type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create student"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {selectedUser && (
          <AdminUserProfileModal
            user={selectedUser}
            roleLabel="Student"
            onClose={() => setSelectedUser(null)}
            onUpdated={updateSelectedUser}
            onToggle={() => toggle(selectedUser)}
            onRemove={() => {
              setDeleteUser(selectedUser);
              setSelectedUser(null);
            }}
          />
        )}

        {deleteUser && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card card__pad modal-card modal-card--confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-student-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setDeleteUser(null)}
              >
                ×
              </button>
              <h2 id="remove-student-title">Remove student?</h2>
              <p>Remove {deleteUser.name} from the student list?</p>
              <div className="modal-actions">
                <button
                  className="table-action danger"
                  type="button"
                  onClick={remove}
                  disabled={busy}
                >
                  {busy ? "Removing…" : "Remove student"}
                </button>
                <button
                  className="chip"
                  type="button"
                  onClick={() => setDeleteUser(null)}
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
