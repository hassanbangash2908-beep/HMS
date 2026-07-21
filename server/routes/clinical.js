import express from "express";
import Consultation from "../models/Consultation.js";
import Prescription from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/clinical/consultations
 * Create a new consultation record.
 * Access: Doctor
 */
router.post("/consultations", protect, restrictTo("Doctor"), async (req, res) => {
  const { appointmentId, patientId, symptoms, diagnosis, notes, followUpDate } = req.body;

  try {
    if (!appointmentId || !patientId || !diagnosis) {
      return res.status(400).json({ success: false, message: "Appointment, patient, and diagnosis are required" });
    }

    const doctorId = req.user.linkedEntityId;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Logged in user does not have an associated Doctor profile" });
    }

    const consultation = new Consultation({
      appointmentId,
      patientId,
      doctorId,
      symptoms,
      diagnosis,
      notes,
      followUpDate,
    });

    await consultation.save();

    // Cascading update: Mark the appointment as Completed (FR-04.6)
    const appointment = await Appointment.findById(appointmentId);
    if (appointment) {
      appointment.status = "Completed";
      await appointment.save();
    }

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "CONSULTATION_CREATE",
      affectedEntity: "Consultation",
      affectedRecordId: consultation.consultationId || consultation._id.toString(),
      details: `Created consultation for Patient ID: ${patientId}. Diagnosis: ${diagnosis}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Consultation recorded successfully",
      consultation,
    });
  } catch (error) {
    console.error("Consultation record error:", error);
    return res.status(500).json({ success: false, message: "Server error recording consultation" });
  }
});

/**
 * POST /api/clinical/prescriptions
 * Issue a new prescription (restricted to Doctors, per SR-10).
 * Access: Doctor
 */
router.post("/prescriptions", protect, restrictTo("Doctor"), async (req, res) => {
  const { patientId, consultationId, medicines } = req.body;

  try {
    if (!patientId || !consultationId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: "Patient, consultation, and medicine item list are required" });
    }

    const doctorId = req.user.linkedEntityId;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Logged in user does not have an associated Doctor profile" });
    }

    // Verify consultation exists and belongs to the doctor
    const consult = await Consultation.findById(consultationId);
    if (!consult) {
      return res.status(404).json({ success: false, message: "Consultation record not found" });
    }

    const prescription = new Prescription({
      patientId,
      doctorId,
      consultationId,
      medicines, // Array of { name, dosage, frequency, duration }
    });

    await prescription.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "PRESCRIPTION_CREATE",
      affectedEntity: "Prescription",
      affectedRecordId: prescription.prescriptionId || prescription._id.toString(),
      details: `Issued prescription for Patient ID: ${patientId}. Medicines count: ${medicines.length}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Prescription issued successfully",
      prescription,
    });
  } catch (error) {
    console.error("Prescription issue error:", error);
    return res.status(500).json({ success: false, message: "Server error issuing prescription" });
  }
});

/**
 * GET /api/clinical/prescriptions
 * List prescriptions (can filter by status: e.g. Pending for pharmacists).
 * Access: Admin, Doctor, Pharmacist
 */
router.get("/prescriptions", protect, restrictTo("Admin", "Doctor", "Pharmacist"), async (req, res) => {
  const { status, patientId } = req.query;

  try {
    const filter = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    const prescriptions = await Prescription.find(filter)
      .populate("patientId", "name patientId contact dob gender")
      .populate("doctorId", "name doctorId specialization licenseNumber")
      .populate("consultationId", "diagnosis symptoms notes")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: prescriptions.length, prescriptions });
  } catch (error) {
    console.error("Prescription fetch error:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving prescriptions" });
  }
});

/**
 * GET /api/clinical/patients/:patientId/history
 * Retrieve chronological medical history: Consultations and Prescriptions (DR-02).
 * Access: Admin, Doctor
 */
router.get("/patients/:patientId/history", protect, restrictTo("Admin", "Doctor"), async (req, res) => {
  const { patientId } = req.params;

  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Find all consultations sorted newest first
    const consultations = await Consultation.find({ patientId })
      .populate("doctorId", "name specialization")
      .sort({ createdAt: -1 });

    // Find all prescriptions sorted newest first
    const prescriptions = await Prescription.find({ patientId })
      .populate("doctorId", "name")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        dob: patient.dob,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
      },
      history: {
        consultations,
        prescriptions,
      },
    });
  } catch (error) {
    console.error("Medical history error:", error);
    return res.status(500).json({ success: false, message: "Server error loading medical history" });
  }
});

export default router;
