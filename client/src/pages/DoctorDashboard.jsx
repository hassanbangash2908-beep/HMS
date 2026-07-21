import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ClipboardList, History, FilePlus2, CheckCircle, ShieldAlert, Plus, Trash2 } from "lucide-react";

export default function DoctorDashboard() {
  const { authFetch, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  
  // History state
  const [historyPatient, setHistoryPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Diagnosis Form State
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Prescription List Builder
  const [medicines, setMedicines] = useState([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("Once daily");
  const [medDuration, setMedDuration] = useState("5 days");

  const [loadingQueue, setLoadingQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const doctorId = user?.linkedEntityId;

  const fetchQueue = async () => {
    if (!doctorId) return;
    try {
      setLoadingQueue(true);
      const res = await authFetch(`/api/appointments?doctorId=${doctorId}&status=Scheduled`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [doctorId]);

  const loadMedicalHistory = async (patientId) => {
    try {
      setLoadingHistory(true);
      const res = await authFetch(`/api/clinical/patients/${patientId}/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryPatient(data.patient);
        setConsultations(data.history.consultations);
        setPrescriptions(data.history.prescriptions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectAppointment = (app) => {
    setSelectedApp(app);
    setError("");
    setSuccess("");
    // Clear forms
    setSymptoms("");
    setDiagnosis("");
    setNotes("");
    setFollowUpDate("");
    setMedicines([]);
    
    if (app.patientId) {
      loadMedicalHistory(app.patientId._id);
    }
  };

  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (!medName || !medDosage || !medFrequency || !medDuration) {
      return;
    }
    const item = {
      name: medName,
      dosage: medDosage,
      frequency: medFrequency,
      duration: medDuration,
    };
    setMedicines([...medicines, item]);
    // Clear input
    setMedName("");
    setMedDosage("");
  };

  const handleRemoveMedicine = (idx) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedApp) return;
    if (!diagnosis) {
      setError("Please input a final diagnostic summary.");
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Submit Consultation
      const consultRes = await authFetch("/api/clinical/consultations", {
        method: "POST",
        body: JSON.stringify({
          appointmentId: selectedApp._id,
          patientId: selectedApp.patientId._id,
          symptoms,
          diagnosis,
          notes,
          followUpDate,
        }),
      });
      const consultData = await consultRes.json();

      if (!consultRes.ok || !consultData.success) {
        setError(consultData.message || "Failed to record consultation");
        setSubmitting(false);
        return;
      }

      // 2. Submit Prescription if any medicines were added
      if (medicines.length > 0) {
        const rxRes = await authFetch("/api/clinical/prescriptions", {
          method: "POST",
          body: JSON.stringify({
            patientId: selectedApp.patientId._id,
            consultationId: consultData.consultation._id,
            medicines,
          }),
        });
        const rxData = await rxRes.json();
        if (!rxRes.ok || !rxData.success) {
          setError(`Consultation saved, but prescription failed: ${rxData.message}`);
          setSubmitting(false);
          return;
        }
      }

      setSuccess("Consultation and prescriptions finalized and saved successfully!");
      setSelectedApp(null);
      setHistoryPatient(null);
      setConsultations([]);
      setPrescriptions([]);
      fetchQueue();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!doctorId) {
    // Admin / non-doctor users — show informational view instead of blocking error
    if (user?.role === "Admin") {
      return (
        <div className="doctor-dashboard-page">
          <div className="page-header-row">
            <div>
              <h1>Clinical Examination Portal</h1>
              <p className="subtitle">Oversee clinical activity across all doctors</p>
            </div>
          </div>
          <div className="alert alert-info m-6" style={{ display:"flex", alignItems:"center", gap:"10px", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.35)", color:"#a5b4fc", borderRadius:"10px", padding:"16px 20px" }}>
            <ClipboardList size={22} />
            <div>
              <strong>Admin Overview Mode</strong> — You are viewing as Administrator. To perform clinical consultations, log in as a registered Doctor account. Use the <strong>Doctors</strong> page to add doctors and link them to system accounts.
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="alert alert-danger m-6">
        <ShieldAlert size={20} style={{ marginRight: "10px" }} />
        <strong>Profile Conflict:</strong> This login session is not linked to any active Doctor entity. Please contact the administrator.
      </div>
    );
  }


  return (
    <div className="doctor-dashboard-page">
      <div className="page-header-row">
        <div>
          <h1>Clinical Examination Portal</h1>
          <p className="subtitle">Start consultations, pull medical histories, and issue prescriptions</p>
        </div>
      </div>

      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="doctor-portal-grid">
        {/* Patient Queue Card */}
        <div className="card queue-card">
          <div className="card-header">
            <div className="card-title">
              <ClipboardList className="icon-purple" size={20} /> Booking Queue
            </div>
          </div>
          <div className="card-body scroll-panel">
            {loadingQueue ? (
              <div className="page-loading">
                <span className="spinner" /> Loading queues...
              </div>
            ) : appointments.length === 0 ? (
              <div className="idle-state">
                <p>No pending patients in your scheduling queue.</p>
              </div>
            ) : (
              <div className="queue-list">
                {appointments.map((app) => {
                  const isSelected = selectedApp && selectedApp._id === app._id;
                  return (
                    <div
                      key={app._id}
                      className={`queue-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectAppointment(app)}
                    >
                      <div className="queue-item-header">
                        <strong>{app.patientId?.name}</strong>
                        <span className="text-purple">{app.timeSlot}</span>
                      </div>
                      <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
                        ID: {app.patientId?.patientId} | Age: {new Date().getFullYear() - new Date(app.patientId?.dob).getFullYear()} yrs
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Clinical Workspace (Middle Column) */}
        <div className="card workspace-card">
          <div className="card-header">
            <div className="card-title">
              <ClipboardList className="icon-purple" size={20} /> Examination Log
            </div>
            {selectedApp && (
              <span className="badge badge-blue">
                Active: {selectedApp.patientId?.name}
              </span>
            )}
          </div>
          
          <div className="card-body scroll-panel">
            {!selectedApp ? (
              <div className="idle-state py-12">
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🩺</div>
                <p>Select a patient from the booking queue to begin consultation</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitConsultation} className="clinical-form">
                <h3 className="section-title">Record Consultation notes</h3>
                
                <div className="form-group">
                  <label>Presenting Symptoms</label>
                  <textarea
                    rows={2}
                    placeholder="Describe patient symptoms..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Diagnosis Summary *</label>
                  <input
                    type="text"
                    placeholder="Enter diagnostic finding..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clinical Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Enter treatment plans, advice, etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Recommended Follow-Up Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>

                {/* Prescription card compiler */}
                <h3 className="section-title mt-6">Issue Prescription</h3>
                
                <div className="prescription-builder-box">
                  <div className="grid-form py-2" style={{ gridGap: "8px" }}>
                    <div className="form-group">
                      <label>Medicine Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Panadol 500mg"
                        value={medName}
                        onChange={(e) => setMedName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Dosage</label>
                      <input
                        type="text"
                        placeholder="e.g. 1 tab, 5ml"
                        value={medDosage}
                        onChange={(e) => setMedDosage(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Frequency</label>
                      <select value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)}>
                        <option value="Once daily">Once daily (1-0-0)</option>
                        <option value="Twice daily">Twice daily (1-0-1)</option>
                        <option value="Thrice daily">Thrice daily (1-1-1)</option>
                        <option value="Every 4 hours">Every 4 hours</option>
                        <option value="As required (SOS)">As required (SOS)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Duration</label>
                      <select value={medDuration} onChange={(e) => setMedDuration(e.target.value)}>
                        <option value="3 days">3 Days</option>
                        <option value="5 days">5 Days</option>
                        <option value="7 days">7 Days</option>
                        <option value="10 days">10 Days</option>
                        <option value="14 days">14 Days</option>
                        <option value="30 days">30 Days</option>
                      </select>
                    </div>
                    <div className="span-4 flex justify-end">
                      <button
                        type="button"
                        className="btn btn-secondary flex items-center"
                        style={{ padding: "6px 12px" }}
                        onClick={handleAddMedicine}
                        disabled={!medName || !medDosage}
                      >
                        <Plus size={14} style={{ marginRight: "4px" }} /> Add Medicine
                      </button>
                    </div>
                  </div>

                  {/* Added medicines list */}
                  {medicines.length > 0 && (
                    <table className="table mt-2 bg-darker-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicines.map((med, idx) => (
                          <tr key={idx}>
                            <td><strong>{med.name}</strong></td>
                            <td>{med.dosage}</td>
                            <td><span className="pill pill-info">{med.frequency}</span></td>
                            <td>{med.duration}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: "4px 8px", fontSize: "10px" }}
                                onClick={() => handleRemoveMedicine(idx)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <button type="submit" className="btn btn-primary w-full mt-6" disabled={submitting}>
                  {submitting ? "Finalizing Examination..." : "Finalize & Record Consultation"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Patient History panel (Right Column) */}
        <div className="card history-card">
          <div className="card-header">
            <div className="card-title">
              <History className="icon-purple" size={20} /> Patient Medical History
            </div>
          </div>
          <div className="card-body scroll-panel">
            {!historyPatient ? (
              <div className="idle-state">
                <p>Select a patient to pull immutable medical histories</p>
              </div>
            ) : loadingHistory ? (
              <div className="page-loading">
                <span className="spinner" /> Loading history files...
              </div>
            ) : (
              <div className="history-panel-details">
                <div className="patient-demographic-box mb-4">
                  <h4>{historyPatient.name}</h4>
                  <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                    Blood Group: <span className="text-purple">{historyPatient.bloodGroup || "Not set"}</span>
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
                    Allergies:{" "}
                    {historyPatient.allergies && historyPatient.allergies.length > 0 ? (
                      historyPatient.allergies.map((a, i) => (
                        <span key={i} className="pill pill-danger m-1">{a}</span>
                      ))
                    ) : (
                      <span style={{ opacity: 0.5 }}>None</span>
                    )}
                  </div>
                </div>

                {/* Consultations History */}
                <h4 className="section-title mt-4">Past Diagnoses</h4>
                {consultations.length === 0 ? (
                  <p style={{ fontSize: "12px", opacity: 0.5 }}>No past diagnostic files recorded.</p>
                ) : (
                  <div className="history-list">
                    {consultations.map((c) => (
                      <div key={c._id} className="history-item">
                        <div className="history-item-date">
                          {new Date(c.createdAt).toLocaleDateString()} by {c.doctorId?.name}
                        </div>
                        <div className="history-item-diagnosis">
                          <strong>Diagnosis:</strong> {c.diagnosis}
                        </div>
                        {c.symptoms && (
                          <div className="history-item-notes">
                            <strong>Symptoms:</strong> {c.symptoms}
                          </div>
                        )}
                        {c.notes && (
                          <div className="history-item-notes">
                            <strong>Notes:</strong> {c.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Prescriptions History */}
                <h4 className="section-title mt-4">Past Prescriptions</h4>
                {prescriptions.length === 0 ? (
                  <p style={{ fontSize: "12px", opacity: 0.5 }}>No past prescription scripts issued.</p>
                ) : (
                  <div className="history-list">
                    {prescriptions.map((rx) => (
                      <div key={rx._id} className="history-item">
                        <div className="history-item-date">
                          {new Date(rx.createdAt).toLocaleDateString()} - status:{" "}
                          <span className={`badge ${rx.status === "Dispensed" ? "badge-success" : "badge-blue"}`}>
                            {rx.status}
                          </span>
                        </div>
                        <div className="history-item-rx-items mt-1">
                          {rx.medicines.map((m, idx) => (
                            <div key={idx} style={{ fontSize: "11px" }}>
                              • {m.name} ({m.dosage}) - {m.frequency} for {m.duration}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
