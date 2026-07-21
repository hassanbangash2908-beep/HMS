import express from "express";
import Patient from "../models/Patient.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/patients
 * Register a new patient.
 * Access: Admin, Receptionist
 */
router.post("/", protect, restrictTo("Admin", "Receptionist"), async (req, res) => {
  const {
    name,
    dob,
    gender,
    cnic,
    contact,
    address,
    emergencyContact,
    emergencyContactRelationship,
    bloodGroup,
    allergies,
    maritalStatus,
    occupation,
  } = req.body;

  try {
    if (!name || !dob || !gender || !cnic || !contact || !address || !emergencyContact) {
      return res.status(400).json({ success: false, message: "Please fill in all mandatory fields" });
    }

    // Validate CNIC uniqueness
    const cnicExists = await Patient.findOne({ cnic });
    if (cnicExists) {
      return res.status(400).json({
        success: false,
        message: "Duplicate registration: A patient with this CNIC is already registered.",
      });
    }

    const patient = new Patient({
      name,
      dob,
      gender,
      cnic,
      contact,
      address,
      emergencyContact,
      emergencyContactRelationship,
      bloodGroup,
      allergies,
      maritalStatus,
      occupation,
    });

    await patient.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "PATIENT_CREATE",
      affectedEntity: "Patient",
      affectedRecordId: patient.patientId || patient._id.toString(),
      details: `Registered patient: ${name} (${patient.patientId})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient,
    });
  } catch (error) {
    console.error("Patient register error:", error);
    return res.status(500).json({ success: false, message: "Server error during patient registration" });
  }
});

/**
 * GET /api/patients
 * List, search and filter patients.
 * Search parameters: query (Patient ID, name, CNIC, or contact)
 * Access: Admin, Doctor, Receptionist, Pharmacist, Billing Staff
 */
router.get("/", protect, async (req, res) => {
  const { search } = req.query;

  try {
    let filter = { status: "Active" };

    if (search) {
      filter = {
        $and: [
          { status: "Active" },
          {
            $or: [
              { patientId: { $regex: search, $options: "i" } },
              { name: { $regex: search, $options: "i" } },
              { cnic: { $regex: search, $options: "i" } },
              { contact: { $regex: search, $options: "i" } },
            ],
          },
        ],
      };
    }

    const start = Date.now();
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    const duration = Date.now() - start;

    // Check response SLA (FR-01.5: within 3 seconds)
    if (duration > 3000) {
      console.warn(`[WARN] Search took too long: ${duration}ms`);
    }

    return res.json({
      success: true,
      count: patients.length,
      responseTimeMs: duration,
      patients,
    });
  } catch (error) {
    console.error("Patient listing error:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving patients" });
  }
});

/**
 * GET /api/patients/:id
 * Get patient details.
 * Access: Admin, Doctor, Receptionist, Pharmacist, Billing Staff
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    return res.json({ success: true, patient });
  } catch (error) {
    console.error("Patient details error:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving patient details" });
  }
});

/**
 * PUT /api/patients/:id
 * Update patient details.
 * Access: Admin, Receptionist
 */
router.put("/:id", protect, restrictTo("Admin", "Receptionist"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Exclude CNIC and PatientID from modification
    const updates = req.body;
    delete updates.cnic;
    delete updates.patientId;

    Object.assign(patient, updates);
    await patient.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "PATIENT_UPDATE",
      affectedEntity: "Patient",
      affectedRecordId: patient.patientId || patient._id.toString(),
      details: `Updated info for patient: ${patient.name}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Patient updated successfully", patient });
  } catch (error) {
    console.error("Patient update error:", error);
    return res.status(500).json({ success: false, message: "Server error during update" });
  }
});

/**
 * DELETE /api/patients/:id
 * Soft-delete / deactivate patient record.
 * Access: Admin
 */
router.delete("/:id", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    patient.status = "Inactive";
    await patient.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "PATIENT_DEACTIVATE",
      affectedEntity: "Patient",
      affectedRecordId: patient.patientId || patient._id.toString(),
      details: `Deactivated patient record: ${patient.name}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Patient deactivated successfully" });
  } catch (error) {
    console.error("Patient delete error:", error);
    return res.status(500).json({ success: false, message: "Server error during deactivation" });
  }
});

export default router;
