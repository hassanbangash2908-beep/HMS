import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  username: {
    type: String,
    trim: true,
  },
  action: {
    type: String,
    required: true, // e.g. "PATIENT_CREATE", "APPOINTMENT_BOOK", "INVOICE_FINALIZE"
  },
  affectedEntity: {
    type: String,
    required: true, // e.g. "Patient", "Appointment", "Invoice"
  },
  affectedRecordId: {
    type: String, // String representation of the ID (e.g. Patient ID or Mongo ObjectId)
    required: true,
  },
  details: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Avoid index modification/deletion checks
const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
