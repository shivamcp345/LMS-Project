import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import AdminUserProfileModal from "../components/AdminUserProfileModal";
import FormField from "../components/FormField";
import { listUsers, addUser, removeUser, toggleUserStatus } from "../api/users";

export default function AdminTrainers() {
  const [trainers, setTrainers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const data = await listUsers();
      const nextTrainers = (Array.isArray(data) ? data : []).filter(
        (user) => user.role === "trainer",
      );
      setTrainers(nextTrainers);
      return nextTrainers;
    } catch (err) {
      setError(err.response?.data?.message || "Could not load trainers.");
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
          setTrainers(
            (Array.isArray(data) ? data : []).filter(
              (user) => user.role === "trainer",
            ),
          );
      })
      .catch((err) => {
        if (isCurrent)
          setError(err.response?.data?.message || "Could not load trainers.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const visible = trainers.filter((trainer) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      trainer.name?.toLowerCase().includes(query) ||
      trainer.email?.toLowerCase().includes(query)
    );
  });

  async function createTrainer(event) {
    event.preventDefault();
    try {
      setBusy(true);
      setError("");
      await addUser({ ...form, role: "trainer" });
      setForm({ name: "", email: "", password: "" });
      setShowAdd(false);
      setSuccess("Trainer created successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create trainer.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(trainer) {
    try {
      setError("");
      await toggleUserStatus(trainer._id || trainer.id);
      const refreshed = await load();
      setSelected(
        refreshed.find(
          (item) => (item._id || item.id) === (trainer._id || trainer.id),
        ) || null,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not update trainer.");
    }
  }

  async function remove() {
    if (!removeTarget) return;
    try {
      setBusy(true);
      await removeUser(removeTarget._id || removeTarget.id);
      setRemoveTarget(null);
      setSuccess("Trainer removed successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove trainer.");
    } finally {
      setBusy(false);
    }
  }

  function updateSelected(updated) {
    setSelected(updated);
    setTrainers((current) =>
      current.map((trainer) =>
        (trainer._id || trainer.id) === (updated._id || updated.id)
          ? updated
          : trainer,
      ),
    );
  }

  return (
    <AppShell>
      <main className="page staff-page">
        <div className="page__head">
          <div>
            <span className="eyebrow">PEOPLE</span>
            <h1>Manage trainers</h1>
            <p>Manage teaching staff and their account status.</p>
          </div>
          <button
            className="hero-btn"
            type="button"
            onClick={() => setShowAdd(true)}
          >
            ＋ Add trainer
          </button>
        </div>
        {error && <div className="banner banner--error">{error}</div>}
        {success && <div className="banner banner--success">{success}</div>}
        <section className="card admin-user-list">
          <div className="table-toolbar table-toolbar--fancy">
            <div className="search-box">
              ⌕
              <input
                aria-label="Search trainers"
                placeholder="Search trainers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <span className="table-count">{visible.length} trainers</span>
          </div>
          {loading ? (
            <div className="card__pad empty-state">Loading trainers…</div>
          ) : !visible.length ? (
            <div className="card__pad empty-state">No trainers found.</div>
          ) : (
            <div className="users-grid users-grid--students">
              {visible.map((trainer) => (
                <article
                  className="user-card user-card--student user-card--compact"
                  key={trainer._id}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${trainer.name || "trainer"} profile`}
                  onClick={() => setSelected(trainer)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(trainer);
                    }
                  }}
                >
                  <div className="user-card__top">
                    <div className="user-card__identity">
                      <div className="user-card__avatar">
                        {(trainer.name || "T")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 title={trainer.name}>
                          {trainer.name || "Unknown trainer"}
                        </h3>
                        <p title={trainer.email}>{trainer.email}</p>
                      </div>
                    </div>
                    <span
                      className={`pill ${trainer.isActive === false ? "pill--red" : "pill--green"}`}
                    >
                      <i aria-hidden="true" />
                      {trainer.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {showAdd && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card card__pad modal-card modal-card--wide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-trainer-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
              <h2 id="add-trainer-title">Add trainer</h2>
              <form onSubmit={createTrainer}>
                <div className="form-grid">
                  <FormField
                    label="Full name *"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    required
                  />
                  <FormField
                    label="Email *"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    required
                  />
                  <FormField
                    label="Password *"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    minLength={8}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    className="chip"
                    type="button"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </button>
                  <button className="hero-btn" type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create trainer"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {selected && (
          <AdminUserProfileModal
            user={selected}
            roleLabel="Trainer"
            onClose={() => setSelected(null)}
            onUpdated={updateSelected}
            onToggle={() => toggle(selected)}
            onRemove={() => {
              setRemoveTarget(selected);
              setSelected(null);
            }}
          />
        )}

        {removeTarget && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="card card__pad modal-card modal-card--confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-trainer-title"
            >
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setRemoveTarget(null)}
              >
                ×
              </button>
              <h2 id="remove-trainer-title">Remove trainer?</h2>
              <p>Remove {removeTarget.name}?</p>
              <div className="modal-actions">
                <button
                  className="chip"
                  type="button"
                  onClick={() => setRemoveTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="table-action danger"
                  type="button"
                  onClick={remove}
                  disabled={busy}
                >
                  {busy ? "Removing…" : "Remove trainer"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
