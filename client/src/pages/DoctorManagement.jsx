import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { UserCheck, CheckCircle, ShieldAlert, Plus, Trash } from "lucide-react";

export default function DoctorManagement() {
  const { authFetch, user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Doctor Form State
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [consultationFee, setConsultationFee] = useState(1000);
  
  // Schedule state
  const [selectedDays, setSelectedDays] = useState([]);
  const [timeSlots, setTimeSlots] = useState(["09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00", "11:00 - 11:30", "11:30 - 12:00"]);
  const [newSlot, setNewSlot] = useState("");

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/doctors");
      const data = await res.json();
      if (res.ok && data.success) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDayToggle = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (newSlot && !timeSlots.includes(newSlot)) {
      setTimeSlots([...timeSlots, newSlot].sort());
      setNewSlot("");
    }
  };

  const handleRemoveSlot = (slot) => {
    setTimeSlots(timeSlots.filter((s) => s !== slot));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !specialization || !licenseNumber || !contactInfo || consultationFee === undefined) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (selectedDays.length === 0) {
      setError("Please select at least one working day.");
      return;
    }

    try {
      const res = await authFetch("/api/doctors", {
        method: "POST",
        body: JSON.stringify({
          name,
          specialization,
          licenseNumber,
          contactInfo,
          consultationFee,
          schedule: {
            workingDays: selectedDays,
            timeSlots,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Doctor profile created successfully! ID: ${data.doctor.doctorId}`);
        // Reset fields
        setName("");
        setSpecialization("");
        setLicenseNumber("");
        setContactInfo("");
        setConsultationFee(1000);
        setSelectedDays([]);
        fetchDoctors();

        setTimeout(() => {
          setShowModal(false);
          setSuccess("");
        }, 2000);
      } else {
        setError(data.message || "Failed to create doctor profile");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const isAdmin = user && user.role === "Admin";

  return (
    <div className="doctors-page">
      <div className="page-header-row">
        <div>
          <h1>Doctor Directory</h1>
          <p className="subtitle">Clinical staff specialities and availability schedules</p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: "6px" }} /> Add New Doctor Profile
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <UserCheck className="icon-purple" size={20} /> Active Practitioners
          </div>
        </div>

        <div className="card-body scroll-panel">
          {loading ? (
            <div className="page-loading">
              <span className="spinner" /> Loading list...
            </div>
          ) : doctors.length === 0 ? (
            <div className="idle-state">
              <p>No doctor profiles created yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor ID</th>
                  <th>Practitioner Name</th>
                  <th>License Code</th>
                  <th>Speciality</th>
                  <th>Consultation Fee</th>
                  <th>Working Days</th>
                  <th>Time Slots</th>
                  <th>Contact Info</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d._id}>
                    <td><strong className="text-purple">{d.doctorId}</strong></td>
                    <td><strong>{d.name}</strong></td>
                    <td><code>{d.licenseNumber}</code></td>
                    <td><span className="badge badge-purple">{d.specialization}</span></td>
                    <td><strong>Rs. {d.consultationFee}</strong></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {d.schedule.workingDays.map((day, idx) => (
                          <span key={idx} className="pill pill-success m-1">{day.slice(0, 3)}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ maxWidth: "250px" }}>
                      <div className="flex flex-wrap gap-1">
                        {d.schedule.timeSlots.slice(0, 3).map((slot, idx) => (
                          <span key={idx} className="pill pill-info m-1">{slot}</span>
                        ))}
                        {d.schedule.timeSlots.length > 3 && (
                          <span className="pill pill-muted m-1">+{d.schedule.timeSlots.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td>{d.contactInfo}</td>
                  </tr>
                ))}
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
              <h2>Add New Doctor Profile</h2>
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
                  <label>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Specialization *</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiologist, General Physician"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Medical License Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. PMDC-12345-D"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Details *</label>
                  <input type="text" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Consultation Fee (Rs.) *</label>
                  <input
                    type="number"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    required
                  />
                </div>

                {/* Working Days Checkboxes */}
                <div className="form-group span-2">
                  <label>Config Working Days *</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {daysOfWeek.map((day) => {
                      const isChecked = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`btn ${isChecked ? "btn-primary" : "btn-muted"}`}
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => handleDayToggle(day)}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots Config */}
                <div className="form-group span-2">
                  <label>Configure Consultation Time Slots</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="e.g. 14:00 - 14:30"
                      value={newSlot}
                      onChange={(e) => setNewSlot(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleAddSlot}>
                      Add Slot
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3" style={{ maxHeight: "120px", overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", padding: "10px", borderRadius: "8px" }}>
                    {timeSlots.map((slot) => (
                      <span key={slot} className="pill pill-info m-1 flex items-center gap-1">
                        {slot}
                        <Trash
                          size={12}
                          className="cursor-pointer text-red-400 hover:text-red-600"
                          onClick={() => handleRemoveSlot(slot)}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="span-2 flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-muted" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Doctor Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
