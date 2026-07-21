import express from "express";
import Staff from "../models/Staff.js";
import User from "../models/User.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/staff
 * Create a new staff member profile.
 * Access: Admin
 */
router.post("/", protect, restrictTo("Admin"), async (req, res) => {
  const { name, role, contactInfo, shiftTiming } = req.body;

  try {
    if (!name || !role || !contactInfo) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields" });
    }

    const staff = new Staff({
      name,
      role,
      contactInfo,
      shiftTiming,
    });

    await staff.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "STAFF_CREATE",
      affectedEntity: "Staff",
      affectedRecordId: staff.staffId || staff._id.toString(),
      details: `Created staff member: ${name} (Role: ${role})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: "Staff profile created successfully", staff });
  } catch (error) {
    console.error("Staff create error:", error);
    return res.status(500).json({ success: false, message: "Server error during staff creation" });
  }
});

/**
 * GET /api/staff
 * List all active staff members.
 * Access: Admin
 */
router.get("/", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const staffList = await Staff.find({ status: "Active" }).sort({ createdAt: -1 });
    return res.json({ success: true, count: staffList.length, staffList });
  } catch (error) {
    console.error("Staff listing error:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving staff" });
  }
});

/**
 * PUT /api/staff/:id
 * Update staff member details.
 * Access: Admin
 */
router.put("/:id", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const updates = req.body;
    delete updates.staffId; // prevent ID manipulation

    Object.assign(staff, updates);
    await staff.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "STAFF_UPDATE",
      affectedEntity: "Staff",
      affectedRecordId: staff.staffId || staff._id.toString(),
      details: `Updated staff profile: ${staff.name}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Staff profile updated successfully", staff });
  } catch (error) {
    console.error("Staff update error:", error);
    return res.status(500).json({ success: false, message: "Server error updating staff profile" });
  }
});

/**
 * DELETE /api/staff/:id
 * Soft-delete / deactivate staff member profile and cascade to active User login.
 * Access: Admin
 */
router.delete("/:id", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    staff.status = "Inactive";
    await staff.save();

    // Cascading deactivation: If there is a User account associated with this staff, deactivate it
    const linkedUser = await User.findOne({ linkedEntityId: staff._id });
    let sessionInvalidated = false;
    if (linkedUser) {
      linkedUser.status = "Inactive";
      await linkedUser.save();
      sessionInvalidated = true;
    }

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "STAFF_DEACTIVATE",
      affectedEntity: "Staff",
      affectedRecordId: staff.staffId || staff._id.toString(),
      details: `Deactivated staff profile: ${staff.name}. Linked user account deactivated: ${sessionInvalidated}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: "Staff member deactivated successfully. Linked login sessions invalidated.",
    });
  } catch (error) {
    console.error("Staff deactivation error:", error);
    return res.status(500).json({ success: false, message: "Server error deactivating staff profile" });
  }
});

export default router;
