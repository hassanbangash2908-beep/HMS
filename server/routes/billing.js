import express from "express";
import Invoice from "../models/Invoice.js";
import Patient from "../models/Patient.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/billing
 * Generate a new invoice (initially Unpaid).
 * Access: Admin, Billing Staff
 */
router.post("/", protect, restrictTo("Admin", "Billing Staff"), async (req, res) => {
  const { patientId, itemizedCharges } = req.body;

  try {
    if (!patientId || !itemizedCharges || !Array.isArray(itemizedCharges) || itemizedCharges.length === 0) {
      return res.status(400).json({ success: false, message: "Patient and itemized charges list are required" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Calculate total
    const totalAmount = itemizedCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);

    const invoice = new Invoice({
      patientId,
      itemizedCharges,
      totalAmount,
      status: "Unpaid",
      issuedBy: req.user._id,
    });

    await invoice.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "INVOICE_CREATE",
      affectedEntity: "Invoice",
      affectedRecordId: invoice.invoiceId || invoice._id.toString(),
      details: `Generated invoice for Patient: ${patient.name}. Total: Rs. ${totalAmount}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: "Invoice generated successfully", invoice });
  } catch (error) {
    console.error("Invoice generate error:", error);
    return res.status(500).json({ success: false, message: "Server error generating invoice" });
  }
});

/**
 * GET /api/billing
 * List invoices with filters.
 * Access: Admin, Billing Staff
 */
router.get("/", protect, restrictTo("Admin", "Billing Staff"), async (req, res) => {
  const { status, patientId, search } = req.query;

  try {
    const filter = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (search) {
      filter.$or = [
        { invoiceId: { $regex: search, $options: "i" } },
        { linkedOriginalInvoiceId: { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await Invoice.find(filter)
      .populate("patientId", "name patientId contact DOB")
      .populate("issuedBy", "username")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    console.error("Invoice listing error:", error);
    return res.status(500).json({ success: false, message: "Server error listing invoices" });
  }
});

/**
 * PUT /api/billing/:id/pay
 * Finalize billing payment (Status changes to Paid).
 * Access: Admin, Billing Staff
 */
router.put("/:id/pay", protect, restrictTo("Admin", "Billing Staff"), async (req, res) => {
  const { paymentMethod } = req.body;

  try {
    const invoice = await Invoice.findById(req.params.id).populate("patientId", "name");
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({ success: false, message: "Invoice is already paid" });
    }

    invoice.status = "Paid";
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    await invoice.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "INVOICE_PAY",
      affectedEntity: "Invoice",
      affectedRecordId: invoice.invoiceId || invoice._id.toString(),
      details: `Collected payment of Rs. ${invoice.totalAmount} via ${invoice.paymentMethod} for Patient: ${invoice.patientId?.name}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Payment processed successfully", invoice });
  } catch (error) {
    console.error("Payment finalize error:", error);
    return res.status(500).json({ success: false, message: "Server error completing payment" });
  }
});

/**
 * POST /api/billing/:id/credit-note
 * Issue a refund credit note for a paid invoice. Marks original as Refunded. (IR-02 enforcement).
 * Access: Admin, Billing Staff
 */
router.post("/:id/credit-note", protect, restrictTo("Admin", "Billing Staff"), async (req, res) => {
  const { reason } = req.body;

  try {
    const originalInvoice = await Invoice.findById(req.params.id).populate("patientId", "name");
    if (!originalInvoice) {
      return res.status(404).json({ success: false, message: "Original invoice not found" });
    }

    if (originalInvoice.status === "Refunded") {
      return res.status(400).json({ success: false, message: "Invoice is already refunded via credit note" });
    }

    if (originalInvoice.isCreditNote) {
      return res.status(400).json({ success: false, message: "Cannot issue a credit note on another credit note" });
    }

    // Set original status to Refunded
    originalInvoice.status = "Refunded";
    await originalInvoice.save();

    // Create Credit Note (Invoice with negative total/charges or labeled as credit note)
    const creditNote = new Invoice({
      patientId: originalInvoice.patientId._id,
      itemizedCharges: originalInvoice.itemizedCharges.map((item) => ({
        item: `Refund: ${item.item}`,
        amount: -item.amount,
      })),
      totalAmount: originalInvoice.totalAmount, // absolute total refunded
      paymentMethod: "Credit Note",
      status: "Refunded",
      issuedBy: req.user._id,
      isCreditNote: true,
      linkedOriginalInvoiceId: originalInvoice.invoiceId,
    });

    await creditNote.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "INVOICE_CREDIT_NOTE",
      affectedEntity: "Invoice",
      affectedRecordId: creditNote.invoiceId || creditNote._id.toString(),
      details: `Issued credit note ${creditNote.invoiceId} reversing invoice ${originalInvoice.invoiceId}. Reason: ${reason || "N/A"}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Credit note recorded and original invoice reversed.",
      creditNote,
    });
  } catch (error) {
    console.error("Credit note issue error:", error);
    return res.status(500).json({ success: false, message: "Server error during credit note creation" });
  }
});

export default router;
