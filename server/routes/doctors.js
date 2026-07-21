import express from "express";
import Doctor from "../models/Doctor.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/doctors
 * Create a new doctor profile.
 * Access: Admin
 */
router.post("/", protect, restrictTo("Admin"), async (req, res) => {
  const { name, specialization, licenseNumber, contactInfo, consultationFee, schedule } = req.body;

  try {
    if (!name || !specialization || !licenseNumber || !contactInfo || consultationFee === undefined) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields" });
    }

    const licenseExists = await Doctor.findOne({ licenseNumber });
    if (licenseExists) {
      return res.status(400).json({ success: false, message: "A doctor with this license number is already registered" });
    }

    const doctor = new Doctor({
      name,
      specialization,
      licenseNumber,
      contactInfo,
      consultationFee,
      schedule: schedule || { workingDays: [], timeSlots: [] },
    });

    await doctor.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "DOCTOR_CREATE",
      affectedEntity: "Doctor",
      affectedRecordId: doctor.doctorId || doctor._id.toString(),
      details: `Created doctor profile: ${name} (${specialization})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: "Doctor profile created successfully", doctor });
  } catch (error) {
    console.error("Doctor create error:", error);
    return res.status(500).json({ success: false, message: "Server error during doctor creation" });
  }
});

/**
 * GET /api/doctors
 * Get list of all doctors.
 * Access: Authenticated users
 */
router.get("/", protect, async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: "Active" }).sort({ name: 1 });
    return res.json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    console.error("Doctor listing error:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving doctors" });
  }
});

/**
 * GET /api/doctors/:id
 * Get doctor details.
 * Access: Authenticated users
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    return res.json({ success: true, doctor });
  } catch (error) {
    console.error("Doctor details error:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving doctor profile" });
  }
});

/**
 * PUT /api/doctors/:id
 * Update doctor profile / weekly schedule.
 * Access: Admin, Doctor (restrict doctor to updating only their own schedule/profile)
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    // Role-based validation: Doctors can only edit their own profile
    if (req.user.role === "Doctor" && req.user.linkedEntityId?.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: "Forbidden - You can only edit your own profile" });
    } else if (req.user.role !== "Admin" && req.user.role !== "Doctor") {
      return res.status(403).json({ success: false, message: "Forbidden - Admin or owner Doctor access required" });
    }

    const updates = req.body;
    // Prevent licenseNumber modifications
    delete updates.licenseNumber;
    delete updates.doctorId;

    Object.assign(doctor, updates);
    await doctor.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "DOCTOR_UPDATE",
      affectedEntity: "Doctor",
      affectedRecordId: doctor.doctorId || doctor._id.toString(),
      details: `Updated doctor profile: ${doctor.name}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Doctor profile updated successfully", doctor });
  } catch (error) {
    console.error("Doctor update error:", error);
    return res.status(500).json({ success: false, message: "Server error updating doctor profile" });
  }
});

/**
 * DELETE /api/doctors/:id
 * Soft-delete / deactivate doctor profile.
 * Access: Admin
 */
router.delete("/:id", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    doctor.status = "Inactive";
    await doctor.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "DOCTOR_DEACTIVATE",
      affectedEntity: "Doctor",
      affectedRecordId: doctor.doctorId || doctor._id.toString(),
      details: `Deactivated doctor profile: ${doctor.name} (blocks new appointments)`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Doctor profile deactivated successfully" });
  } catch (error) {
    console.error("Doctor deactivation error:", error);
    return res.status(500).json({ success: false, message: "Server error deactivating doctor profile" });
  }
});

export default router;
