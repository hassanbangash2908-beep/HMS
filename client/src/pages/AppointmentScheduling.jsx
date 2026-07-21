import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Calendar, Search, CheckCircle, ShieldAlert, Clock, UserCheck } from "lucide-react";

export default function AppointmentScheduling() {
  const { authFetch } = useAuth();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  
  // Search patient filter
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Booking states
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load doctors and appointments
  const loadInitialData = async () => {
    try {
      setLoadingList(true);
      const docRes = await authFetch("/api/doctors");
      const docData = await docRes.json();
      if (docRes.ok && docData.success) {
        setDoctors(docData.doctors);
      }

      const appRes = await authFetch("/api/appointments");
      const appData = await appRes.json();
      if (appRes.ok && appData.success) {
        setAppointments(appData.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Search Patient
  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientSearch) return;
    try {
      const res = await authFetch(`/api/patients?search=${encodeURIComponent(patientSearch)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Check Slots availability
  const checkAvailability = async (doctorId, date) => {
    if (!doctorId || !date) return;
    try {
      setLoadingSlots(true);
      setError("");
      setSelectedSlot("");
      setAvailabilityMessage("");
      
      const res = await authFetch(`/api/appointments/availability?doctorId=${doctorId}&date=${date}`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        setAvailableSlots(data.availableSlots);
        if (data.availableSlots.length === 0) {
          setAvailabilityMessage(data.message || "No slots available on this day.");
        }
      } else {
        setError(data.message || "Failed to load slots");
      }
    } catch (err) {
      setError("Error checking availability slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor && bookingDate) {
      checkAvailability(selectedDoctor, bookingDate);
    }
  }, [selectedDoctor, bookingDate]);

  const handleBook = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedPatient) {
      setError("Please select a registered patient first.");
      return;
    }
    if (!selectedDoctor || !bookingDate || !selectedSlot) {
      setError("Please select a doctor, date, and time slot.");
      return;
    }

    try {
      const res = await authFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient._id,
          doctorId: selectedDoctor,
          date: bookingDate,
          timeSlot: selectedSlot,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Appointment booked successfully!");
        setSelectedPatient(null);
        setSelectedDoctor("");
        setBookingDate("");
        setAvailableSlots([]);
        setSelectedSlot("");
        setPatientSearch("");
        setPatients([]);
        loadInitialData();

        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to book appointment");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const handleCancelAppointment = async (id, patientName) => {
    const reason = window.prompt(`Enter reason for cancelling ${patientName}'s appointment:`);
    if (reason === null) return; // cancel click

    try {
      const res = await authFetch(`/api/appointments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: "Cancelled",
          cancellationReason: reason || "Receptionist cancel request",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Appointment cancelled successfully.");
        loadInitialData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to cancel appointment");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="scheduling-page">
      <div className="page-header-row">
        <div>
          <h1>Appointment Scheduling Desk</h1>
          <p className="subtitle">Book slot reservations, check conflict availability, and manage patient flows</p>
        </div>
      </div>

      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="scheduling-split">
        {/* Booking Card Form */}
        <div className="card booking-card">
          <div className="card-header">
            <div className="card-title">
              <Calendar className="icon-purple" size={20} /> Slot Booking Form
            </div>
          </div>
          <div className="card-body">
            {/* Step 1: Select Patient */}
            <div className="booking-section-block">
              <h4>1. Select Registered Patient</h4>
              {selectedPatient ? (
                <div className="selected-patient-card mt-2">
                  <div className="patient-name-box">
                    <strong>{selectedPatient.name}</strong>
                    <span>{selectedPatient.patientId}</span>
                  </div>
                  <button className="btn btn-muted btn-sm" onClick={() => setSelectedPatient(null)}>Change</button>
                </div>
              ) : (
                <form onSubmit={handlePatientSearch} className="patient-search-subform mt-2">
                  <div className="input-with-icon flex-1">
                    <Search className="input-icon" size={16} />
                    <input
                      type="text"
                      placeholder="Search patient name, CNIC, or ID..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary">Find</button>
                </form>
              )}

              {/* Patient Search Results */}
              {!selectedPatient && patients.length > 0 && (
                <div className="search-results-list mt-2">
                  {patients.map((p) => (
                    <div
                      key={p._id}
                      className="search-result-item"
                      onClick={() => setSelectedPatient(p)}
                    >
                      <div>
                        <strong>{p.name}</strong> ({p.patientId})
                      </div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>
                        CNIC: {p.cnic} | Mob: {p.contact}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select Doctor & Date */}
            <div className="booking-section-block mt-4">
              <h4>2. Select Doctor & Schedule Date</h4>
              <div className="form-group mt-2">
                <label>Choose Medical Officer</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  required
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.specialization}) - Rs. {d.consultationFee}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Appointment Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Step 3: Choose Time Slot */}
            <div className="booking-section-block mt-4">
              <h4>3. Select Available Slot (Overlap-Protected)</h4>
              {loadingSlots ? (
                <div className="text-center py-2" style={{ fontSize: "12px" }}>
                  <span className="spinner" /> Querying schedule logs...
                </div>
              ) : availabilityMessage ? (
                <div className="alert alert-info py-2 my-2" style={{ fontSize: "12px" }}>
                  {availabilityMessage}
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="slots-selection-grid mt-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <Clock size={12} style={{ marginRight: "4px" }} /> {slot}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="idle-state py-2" style={{ fontSize: "12px", opacity: 0.6 }}>
                  Select doctor and date to pull free slots.
                </div>
              )}
            </div>

            <button
              onClick={handleBook}
              className="btn btn-primary w-full mt-6"
              disabled={!selectedPatient || !selectedDoctor || !bookingDate || !selectedSlot}
            >
              <UserCheck size={18} style={{ marginRight: "6px" }} /> Confirm Appointment Slot
            </button>
          </div>
        </div>

        {/* Schedule Queue List */}
        <div className="card schedule-card">
          <div className="card-header">
            <div className="card-title">
              <Clock className="icon-purple" size={20} /> Current Bookings Queue
            </div>
          </div>
          <div className="card-body scroll-panel">
            {loadingList ? (
              <div className="page-loading">
                <span className="spinner" /> Loading active bookings...
              </div>
            ) : appointments.length === 0 ? (
              <div className="idle-state">
                <p>No appointments booked for this cycle.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date / Slot</th>
                    <th>Patient Name</th>
                    <th>Assigned Doctor</th>
                    <th>Booking Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((app) => (
                    <tr key={app._id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <strong>{new Date(app.date).toLocaleDateString()}</strong>
                        <div style={{ fontSize: "10px", opacity: 0.7 }}>
                          {app.timeSlot}
                        </div>
                      </td>
                      <td>
                        <strong>{app.patientId?.name || "Deactivated"}</strong>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>
                          ID: {app.patientId?.patientId || "N/A"}
                        </div>
                      </td>
                      <td>
                        <strong>{app.doctorId?.name || "Deactivated"}</strong>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>
                          {app.doctorId?.specialization || "N/A"}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          app.status === "Scheduled" ? "badge-blue" :
                          app.status === "Completed" ? "badge-success" :
                          "badge-red"
                        }`}>
                          {app.status}
                        </span>
                        {app.cancellationReason && (
                          <div style={{ fontSize: "10px", color: "var(--color-error)", marginTop: "2px" }}>
                            Reas: {app.cancellationReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {app.status === "Scheduled" && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => handleCancelAppointment(app._id, app.patientId?.name)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
