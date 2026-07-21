import express from "express";
import Invoice from "../models/Invoice.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import InventoryItem from "../models/InventoryItem.js";
import AuditLog from "../models/AuditLog.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/reports/dashboard-kpis
 * Returns key operational metrics for the system dashboards (FR-09.2).
 * Access: Admin
 */
router.get("/dashboard-kpis", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Patients registered today
    const newPatientsToday = await Patient.countDocuments({
      createdAt: { $gte: today },
    });

    // Total patients
    const totalPatients = await Patient.countDocuments({ status: "Active" });

    // Appointments scheduled today
    const appointmentsToday = await Appointment.countDocuments({
      date: { $gte: today },
      status: "Scheduled",
    });

    // Total revenue today
    const invoicesToday = await Invoice.find({
      createdAt: { $gte: today },
      status: "Paid",
    });
    const revenueToday = invoicesToday.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Total revenue all-time
    const allPaidInvoices = await Invoice.find({ status: "Paid" });
    const totalRevenue = allPaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Low stock items count
    const lowStockCount = await InventoryItem.countDocuments({
      $expr: { $lte: ["$quantityInStock", "$reorderThreshold"] },
    });

    // Items nearing expiry (30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const nearExpiryCount = await InventoryItem.countDocuments({
      expiryDate: { $gte: new Date(), $lte: thirtyDaysFromNow },
    });

    return res.json({
      success: true,
      kpis: {
        newPatientsToday,
        totalPatients,
        appointmentsToday,
        revenueToday,
        totalRevenue,
        lowStockCount,
        nearExpiryCount,
      },
    });
  } catch (error) {
    console.error("Dashboard KPI fetch error:", error);
    return res.status(500).json({ success: false, message: "Server error aggregating KPIs" });
  }
});

/**
 * GET /api/reports/audit-logs
 * List all activities recorded (AL-03, restricted to Admin).
 * Access: Admin
 */
router.get("/audit-logs", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("userId", "username role")
      .sort({ timestamp: -1 })
      .limit(100); // return last 100 entries

    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error("Audit log retrieve error:", error);
    return res.status(500).json({ success: false, message: "Server error loading audit logs" });
  }
});

/**
 * GET /api/reports/revenue-trends
 * Aggregate monthly and daily revenue trends for charts.
 * Access: Admin
 */
router.get("/revenue-trends", protect, restrictTo("Admin"), async (req, res) => {
  try {
    // Simple mock aggregation or direct fetch from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const invoices = await Invoice.find({
      status: "Paid",
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: 1 });

    // Group by date
    const dailyMap = {};
    invoices.forEach((inv) => {
      const dateStr = new Date(inv.createdAt).toISOString().split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + inv.totalAmount;
    });

    const trends = Object.keys(dailyMap).map((date) => ({
      date,
      amount: dailyMap[date],
    }));

    return res.json({ success: true, trends });
  } catch (error) {
    console.error("Revenue aggregation error:", error);
    return res.status(500).json({ success: false, message: "Server error aggregating revenue trends" });
  }
});

export default router;
