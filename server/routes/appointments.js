import express from "express";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * GET /api/appointments/availability
 * Get available time slots for a doctor on a specific date.
 * Query: doctorId, date (format: YYYY-MM-DD)
 * Access: Authenticated users
 */
router.get("/availability", protect, async (req, res) => {
  const { doctorId, date } = req.query;

  try {
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: "Please provide doctorId and date" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.status === "Inactive") {
      return res.status(404).json({ success: false, message: "Active doctor profile not found" });
    }

    // Determine day of the week
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString("en-US", { weekday: "long" });

    // Check if doctor works on this day
    const worksOnDay = doctor.schedule.workingDays.includes(dayOfWeek);
    if (!worksOnDay) {
      return res.json({
        success: true,
        availableSlots: [],
        message: `${doctor.name} does not work on ${dayOfWeek}s.`,
      });
    }

    // Get all scheduled appointments for this doctor on this day
    // Query range covers the entire day from 00:00 to 23:59:59
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "Scheduled",
    });

    const bookedSlots = bookedAppointments.map((app) => app.timeSlot);

    // Filter available slots
    const availableSlots = doctor.schedule.timeSlots.filter(
      (slot) => !bookedSlots.includes(slot)
    );

    return res.json({
      success: true,
      dayOfWeek,
      allSlots: doctor.schedule.timeSlots,
      bookedSlots,
      availableSlots,
    });
  } catch (error) {
    console.error("Availability error:", error);
    return res.status(500).json({ success: false, message: "Server error checking availability" });
  }
});

/**
 * POST /api/appointments
 * Book a new appointment.
 * Access: Admin, Receptionist
 */
router.post("/", protect, restrictTo("Admin", "Receptionist"), async (req, res) => {
  const { patientId, doctorId, date, timeSlot } = req.body;

  try {
    if (!patientId || !doctorId || !date || !timeSlot) {
      return res.status(400).json({ success: false, message: "Please fill in all booking fields" });
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient || patient.status === "Inactive") {
      return res.status(404).json({ success: false, message: "Active patient record not found" });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.status === "Inactive") {
      return res.status(404).json({ success: false, message: "Active doctor profile not found" });
    }

    // Validate if slot is already booked for this doctor on this day (overlap prevention IR-05)
    const targetDate = new Date(date);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      timeSlot,
      status: "Scheduled",
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "Booking conflict: This slot is already booked for the selected doctor.",
      });
    }

    const appointment = new Appointment({
      patientId,
      doctorId,
      date: targetDate,
      timeSlot,
      createdBy: req.user._id,
    });

    await appointment.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "APPOINTMENT_BOOK",
      affectedEntity: "Appointment",
      affectedRecordId: appointment.appointmentId || appointment._id.toString(),
      details: `Booked appointment for Patient: ${patient.name} with Doctor: ${doctor.name} on ${date} at ${timeSlot}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ success: false, message: "Server error during booking" });
  }
});

/**
 * GET /api/appointments
 * List all appointments with patient and doctor details populated.
 * Access: Admin, Doctor, Receptionist, Billing Staff
 */
router.get("/", protect, async (req, res) => {
  const { doctorId, date, status } = req.query;

  try {
    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(filter)
      .populate("patientId", "name patientId contact dob gender")
      .populate("doctorId", "name doctorId specialization consultationFee")
      .sort({ date: 1, timeSlot: 1 });

    return res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    console.error("Appointment listing error:", error);
    return res.status(500).json({ success: false, message: "Server error listing appointments" });
  }
});

/**
 * PUT /api/appointments/:id/status
 * Update appointment status (Cancel, Reschedule, Complete).
 * Access: Admin, Receptionist, Doctor
 */
router.put("/:id/status", protect, async (req, res) => {
  const { status, cancellationReason, date, timeSlot } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name")
      .populate("doctorId", "name");
      
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (status) {
      appointment.status = status;
    }

    if (status === "Cancelled") {
      appointment.cancellationReason = cancellationReason || "Not specified";
    }

    // Handle rescheduling
    if (date && timeSlot) {
      // Validate slot conflict (overlap prevention IR-05)
      const targetDate = new Date(date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const conflict = await Appointment.findOne({
        _id: { $ne: req.params.id },
        doctorId: appointment.doctorId._id,
        date: { $gte: startOfDay, $lte: endOfDay },
        timeSlot,
        status: "Scheduled",
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "Rescheduling conflict: This time slot is already booked for this doctor.",
        });
      }

      appointment.date = targetDate;
      appointment.timeSlot = timeSlot;
      appointment.status = "Scheduled"; // Reset back to scheduled on change
    }

    await appointment.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: `APPOINTMENT_${status ? status.toUpperCase() : "UPDATE"}`,
      affectedEntity: "Appointment",
      affectedRecordId: appointment.appointmentId || appointment._id.toString(),
      details: `Updated appointment for ${appointment.patientId?.name}. Status: ${appointment.status}. Reason: ${cancellationReason || "N/A"}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Appointment updated successfully", appointment });
  } catch (error) {
    console.error("Update appointment status error:", error);
    return res.status(500).json({ success: false, message: "Server error updating appointment" });
  }
});

export default router;
