import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Users, CheckCircle, ShieldAlert, Plus, PowerOff, ShieldCheck } from "lucide-react";

export default function StaffManagement() {
  const { authFetch, user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Staff Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState("Receptionist");
  const [contactInfo, setContactInfo] = useState("");
  const [shiftTiming, setShiftTiming] = useState("Morning: 08:00 - 16:00");
  
  // Link Account State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createLogin, setCreateLogin] = useState(true);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/staff");
      const data = await res.json();
      if (res.ok && data.success) {
        setStaff(data.staffList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleDeactivate = async (id, staffName) => {
    if (!window.confirm(`Are you sure you want to deactivate ${staffName}? This will lock their login session and disable access.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/staff/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`${staffName} deactivated. Associated user account locked.`);
        fetchStaff();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to deactivate staff member");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !role || !contactInfo) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    try {
      // 1. Create Staff Profile
      const staffRes = await authFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify({ name, role, contactInfo, shiftTiming }),
      });
      const staffData = await staffRes.json();

      if (!staffRes.ok || !staffData.success) {
        setError(staffData.message || "Failed to create staff profile");
        return;
      }

      // 2. Optional: Create associated User login account
      if (createLogin) {
        if (!username || !email || !password) {
          setError("Staff profile created, but login credentials were not completed.");
          return;
        }

        const authRes = await authFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username,
            email,
            password,
            role,
            linkedEntityId: staffData.staff._id,
          }),
        });

        const authData = await authRes.json();
        if (!authRes.ok || !authData.success) {
          setError(`Staff profile created, but user login setup failed: ${authData.message}`);
          return;
        }
      }

      setSuccess("Staff member added and secure login credentials generated successfully!");
      setName("");
      setContactInfo("");
      setUsername("");
      setEmail("");
      setPassword("");
      fetchStaff();

      setTimeout(() => {
        setShowModal(false);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const isAdmin = user && user.role === "Admin";

  return (
    <div className="staff-page">
      <div className="page-header-row">
        <div>
          <h1>Staff Directory</h1>
          <p className="subtitle">Manage administrative, pharmacist, and billing staff accounts</p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: "6px" }} /> Add Staff Member
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users className="icon-purple" size={20} /> Active Staff Listings
          </div>
        </div>

        <div className="card-body scroll-panel">
          {loading ? (
            <div className="page-loading">
              <span className="spinner" /> Loading staff directory...
            </div>
          ) : staff.length === 0 ? (
            <div className="idle-state">
              <p>No active administrative staff registered.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Full Name</th>
                  <th>System Role</th>
                  <th>Contact Info</th>
                  <th>Shift Schedule</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s._id}>
                    <td><strong className="text-purple">{s.staffId}</strong></td>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      <span className="badge badge-blue">{s.role}</span>
                    </td>
                    <td>{s.contactInfo}</td>
                    <td><code>{s.shiftTiming || "Not assigned"}</code></td>
                    <td>
                      <span className="badge badge-success">
                        <ShieldCheck size={12} style={{ marginRight: "4px" }} /> Active
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn btn-danger flex items-center"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => handleDeactivate(s._id, s.name)}
                        >
                          <PowerOff size={12} style={{ marginRight: "4px" }} /> Deactivate
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Staff Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl">
            <div className="modal-header">
              <h2>Add Staff Member & Generate Login</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger mb-4 flex items-center">
                  <ShieldAlert size={16} style={{ marginRight: "8px" }} /> {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success mb-4 flex items-center">
                  <CheckCircle size={16} style={{ marginRight: "8px" }} /> {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid-form">
                <div className="form-group span-2">
                  <h3 className="section-title">Staff Profile Details</h3>
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>System Role *</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Billing Staff">Billing Staff</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Number *</label>
                  <input type="text" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Shift Timing *</label>
                  <select value={shiftTiming} onChange={(e) => setShiftTiming(e.target.value)} required>
                    <option value="Morning: 08:00 - 16:00">Morning (08:00 - 16:00)</option>
                    <option value="Evening: 16:00 - 00:00">Evening (16:00 - 00:00)</option>
                    <option value="Night: 00:00 - 08:00">Night (00:00 - 08:00)</option>
                  </select>
                </div>

                {/* Login Credentials Option */}
                <div className="form-group span-2 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="createLogin"
                    checked={createLogin}
                    onChange={(e) => setCreateLogin(e.target.checked)}
                  />
                  <label htmlFor="createLogin" className="cursor-pointer">Generate secure web login credentials for this staff member</label>
                </div>

                {createLogin && (
                  <>
                    <div className="form-group span-2">
                      <h3 className="section-title mt-4">Web Portal Credentials</h3>
                    </div>

                    <div className="form-group">
                      <label>Login Username *</label>
                      <input
                        type="text"
                        placeholder="e.g. hassan_reception"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={createLogin}
                      />
                    </div>

                    <div className="form-group">
                      <label>Login Email *</label>
                      <input
                        type="email"
                        placeholder="e.g. hassan@subhancare.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={createLogin}
                      />
                    </div>

                    <div className="form-group span-2">
                      <label>Password (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char) *</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={createLogin}
                      />
                    </div>
                  </>
                )}

                <div className="span-2 flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-muted" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Staff Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
