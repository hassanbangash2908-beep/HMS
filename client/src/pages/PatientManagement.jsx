import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, UserPlus, FileText, CheckCircle, ShieldAlert } from "lucide-react";

export default function PatientManagement() {
  const { authFetch, user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Patient Form State
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [cnic, setCnic] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [allergies, setAllergies] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [occupation, setOccupation] = useState("");

  const fetchPatients = async (query = "") => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const handleClear = () => {
    setSearch("");
    fetchPatients("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !dob || !gender || !cnic || !contact || !address || !emergencyContact) {
      setError("Please fill in all mandatory fields (Name, DOB, Gender, CNIC, Contact, Address, Emergency Contact).");
      return;
    }

    try {
      const allergyArray = allergies ? allergies.split(",").map((a) => a.trim()) : [];
      const res = await authFetch("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          name,
          dob,
          gender,
          cnic,
          contact,
          address,
          emergencyContact,
          emergencyContactRelationship,
          bloodGroup,
          allergies: allergyArray,
          maritalStatus,
          occupation,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Patient registered successfully! ID: ${data.patient.patientId}`);
        // Reset form
        setName("");
        setDob("");
        setGender("Male");
        setCnic("");
        setContact("");
        setAddress("");
        setEmergencyContact("");
        setEmergencyContactRelationship("");
        setAllergies("");
        setOccupation("");
        
        fetchPatients();
        setTimeout(() => {
          setShowModal(false);
          setSuccess("");
        }, 2000);
      } else {
        setError(data.message || "Failed to register patient");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const canWrite = user && (user.role === "Admin" || user.role === "Receptionist");

  return (
    <div className="patients-page">
      <div className="page-header-row">
        <div>
          <h1>Patient Records Directory</h1>
          <p className="subtitle">Register and query clinical patient profiles</p>
        </div>

        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={18} style={{ marginRight: "6px" }} /> Register New Patient
          </button>
        )}
      </div>

      {/* Search Header */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearchSubmit} className="search-bar-row">
            <div className="form-group flex-1 m-0">
              <div className="input-with-icon">
                <Search className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search by Patient ID, Name, CNIC, or Contact Number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-secondary">Search</button>
            {search && <button type="button" className="btn btn-muted" onClick={handleClear}>Clear</button>}
          </form>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText className="icon-purple" size={20} /> Directory Listing
          </div>
        </div>

        <div className="card-body scroll-panel">
          {loading ? (
            <div className="page-loading">
              <span className="spinner" /> Loading directories...
            </div>
          ) : patients.length === 0 ? (
            <div className="idle-state">
              <p>No patient records found matching the criteria.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Full Name</th>
                  <th>CNIC Number</th>
                  <th>DOB / Age</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Emergency Contact</th>
                  <th>Allergies</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const age = new Date().getFullYear() - new Date(p.dob).getFullYear();
                  return (
                    <tr key={p._id}>
                      <td><strong className="text-purple">{p.patientId || "Generating..."}</strong></td>
                      <td><strong>{p.name}</strong></td>
                      <td><code>{p.cnic}</code></td>
                      <td>
                        {new Date(p.dob).toLocaleDateString()}{" "}
                        <span style={{ fontSize: "11px", opacity: 0.75 }}>({age} yrs)</span>
                      </td>
                      <td>
                        <span className={`badge ${p.gender === "Male" ? "badge-blue" : "badge-purple"}`}>
                          {p.gender}
                        </span>
                      </td>
                      <td>{p.contact}</td>
                      <td>
                        <div>{p.emergencyContact}</div>
                        <div style={{ fontSize: "10px", opacity: 0.7 }}>
                          {p.emergencyContactRelationship || "No relationship set"}
                        </div>
                      </td>
                      <td style={{ maxWidth: "150px" }}>
                        {p.allergies && p.allergies.length > 0 ? (
                          p.allergies.map((a, i) => (
                            <span key={i} className="pill pill-danger m-1">{a}</span>
                          ))
                        ) : (
                          <span style={{ opacity: 0.5 }}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl">
            <div className="modal-header">
              <h2>Register New Patient File</h2>
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

              <form onSubmit={handleRegister} className="grid-form">
                <div className="form-group span-2">
                  <label>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Gender *</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>CNIC / B-Form Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 37405-1234567-1"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number *</label>
                  <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} required />
                </div>

                <div className="form-group span-2">
                  <label>Address *</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Emergency Contact *</label>
                  <input type="text" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Relationship to Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. Brother, Mother"
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Blood Group</label>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Marital Status</label>
                  <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Occupation</label>
                  <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>

                <div className="form-group span-2">
                  <label>Allergies (comma-separated list)</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Pollen, Peanuts"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                </div>

                <div className="span-2 flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-muted" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Register Patient</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
