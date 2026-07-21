import express from "express";
import InventoryItem from "../models/InventoryItem.js";
import Supplier from "../models/Supplier.js";
import Prescription from "../models/Prescription.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/inventory/items
 * Add a new item to pharmacy inventory.
 * Access: Admin, Pharmacist
 */
router.post("/items", protect, restrictTo("Admin", "Pharmacist"), async (req, res) => {
  const { name, batchNumber, expiryDate, quantityInStock, reorderThreshold, supplierId } = req.body;

  try {
    if (!name || !batchNumber || !expiryDate || quantityInStock === undefined) {
      return res.status(400).json({ success: false, message: "Please fill in all mandatory inventory fields" });
    }

    if (quantityInStock < 0) {
      return res.status(400).json({ success: false, message: "Stock quantity cannot be negative" });
    }

    // Verify supplier if provided
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ success: false, message: "Supplier not found" });
      }
    }

    const item = new InventoryItem({
      name,
      batchNumber,
      expiryDate,
      quantityInStock,
      reorderThreshold: reorderThreshold !== undefined ? reorderThreshold : 10,
      supplierId,
    });

    await item.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "INVENTORY_ITEM_ADD",
      affectedEntity: "InventoryItem",
      affectedRecordId: item.itemId || item._id.toString(),
      details: `Added new stock item: ${name} (Batch: ${batchNumber}, Qty: ${quantityInStock})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: "Inventory item added successfully", item });
  } catch (error) {
    console.error("Add item error:", error);
    return res.status(500).json({ success: false, message: "Server error adding inventory item" });
  }
});

/**
 * GET /api/inventory/items
 * List inventory items with low-stock or near-expiry filters.
 * Filters: lowStock=true, nearExpiry=true
 * Access: Admin, Pharmacist
 */
router.get("/items", protect, restrictTo("Admin", "Pharmacist"), async (req, res) => {
  const { lowStock, nearExpiry, search } = req.query;

  try {
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Filter low stock
    if (lowStock === "true") {
      query.$expr = { $lte: ["$quantityInStock", "$reorderThreshold"] };
    }

    // Filter near expiry (default 30 days)
    if (nearExpiry === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $gte: new Date(), $lte: thirtyDaysFromNow };
    }

    const items = await InventoryItem.find(query)
      .populate("supplierId", "name contactInfo")
      .sort({ name: 1 });

    return res.json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("Fetch items error:", error);
    return res.status(500).json({ success: false, message: "Server error fetching inventory" });
  }
});

/**
 * PUT /api/inventory/items/:id
 * Update inventory details or add stock.
 * Access: Admin, Pharmacist
 */
router.put("/items/:id", protect, restrictTo("Admin", "Pharmacist"), async (req, res) => {
  const { name, batchNumber, expiryDate, quantityInStock, reorderThreshold, supplierId } = req.body;

  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    if (quantityInStock !== undefined && quantityInStock < 0) {
      return res.status(400).json({ success: false, message: "Stock quantity cannot drop below zero" });
    }

    if (name) item.name = name;
    if (batchNumber) item.batchNumber = batchNumber;
    if (expiryDate) item.expiryDate = expiryDate;
    if (quantityInStock !== undefined) item.quantityInStock = quantityInStock;
    if (reorderThreshold !== undefined) item.reorderThreshold = reorderThreshold;
    if (supplierId) item.supplierId = supplierId;

    await item.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "INVENTORY_ITEM_UPDATE",
      affectedEntity: "InventoryItem",
      affectedRecordId: item.itemId || item._id.toString(),
      details: `Updated stock levels for: ${item.name}. Current stock: ${item.quantityInStock}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Inventory item updated successfully", item });
  } catch (error) {
    console.error("Update item error:", error);
    return res.status(500).json({ success: false, message: "Server error updating inventory item" });
  }
});

/**
 * POST /api/inventory/prescriptions/:prescriptionId/dispense
 * Dispense medicines from a doctor's prescription.
 * Automatically checks and deducts stock levels. (FR-08.2, FR-08.3, IR-06, IR-08).
 * Access: Admin, Pharmacist
 */
router.post("/prescriptions/:prescriptionId/dispense", protect, restrictTo("Admin", "Pharmacist"), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.prescriptionId);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    if (prescription.status === "Dispensed") {
      return res.status(400).json({ success: false, message: "Prescription has already been dispensed" });
    }

    // Verify stock availability for all prescribed items first (All-or-Nothing check)
    const itemsToUpdate = [];
    const lowStockAlerts = [];

    for (const med of prescription.medicines) {
      // Find active inventory item matching name (case insensitive)
      // Check for non-expired batch with highest stock
      const inventoryItems = await InventoryItem.find({
        name: { $regex: new RegExp(`^${med.name}$`, "i") },
        expiryDate: { $gt: new Date() },
        quantityInStock: { $gt: 0 },
      }).sort({ quantityInStock: -1 });

      if (inventoryItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Dispensing failed: No active/unexpired stock available for medicine '${med.name}'`,
        });
      }

      // Check cumulative stock in case we need to dispense.
      // For simplicity, we find the first batch that satisfies the quantity.
      // Usually, doctor prescribes dosage and days. Let's assume dispensing quantity is 1 batch or a simple count of 1.
      // We will deduct 1 unit from stock or a standard pack.
      const batchItem = inventoryItems[0];
      const quantityToDeduct = 1; // Dispense 1 pack/bottle/strip

      if (batchItem.quantityInStock < quantityToDeduct) {
        return res.status(400).json({
          success: false,
          message: `Dispensing failed: Insufficient stock for '${med.name}' in batch '${batchItem.batchNumber}'. Available: ${batchItem.quantityInStock}`,
        });
      }

      itemsToUpdate.push({
        item: batchItem,
        deduct: quantityToDeduct,
      });
    }

    // Deduct stock for each item (Transactional simulation)
    for (const update of itemsToUpdate) {
      const dbItem = update.item;
      dbItem.quantityInStock -= update.deduct;
      await dbItem.save();

      // Check reorder threshold (FR-08.3)
      if (dbItem.quantityInStock <= dbItem.reorderThreshold) {
        lowStockAlerts.push(`${dbItem.name} (Batch: ${dbItem.batchNumber}) is now low in stock. Remaining: ${dbItem.quantityInStock}`);
      }
    }

    // Mark prescription as Dispensed
    prescription.status = "Dispensed";
    prescription.dispensedAt = new Date();
    prescription.dispensedBy = req.user._id;
    await prescription.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "PRESCRIPTION_DISPENSE",
      affectedEntity: "Prescription",
      affectedRecordId: prescription.prescriptionId || prescription._id.toString(),
      details: `Dispensed prescription ${prescription.prescriptionId} containing ${prescription.medicines.length} items.`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: "Prescription dispensed successfully. Inventory stock decremented.",
      alerts: lowStockAlerts,
      prescription,
    });
  } catch (error) {
    console.error("Prescription dispensing error:", error);
    return res.status(500).json({ success: false, message: "Server error during dispensing" });
  }
});

/**
 * POST /api/inventory/suppliers
 * Register a new supplier.
 * Access: Admin
 */
router.post("/suppliers", protect, restrictTo("Admin"), async (req, res) => {
  const { name, contactInfo, supplierAddress, supplierPhone, supplierEmail, ntnNumber } = req.body;

  try {
    if (!name || !contactInfo) {
      return res.status(400).json({ success: false, message: "Supplier name and contact info are required" });
    }

    const supplier = new Supplier({
      name,
      contactInfo,
      supplierAddress,
      supplierPhone,
      supplierEmail,
      ntnNumber,
    });

    await supplier.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: "SUPPLIER_CREATE",
      affectedEntity: "Supplier",
      affectedRecordId: supplier.supplierId || supplier._id.toString(),
      details: `Registered supplier: ${name} (NTN: ${ntnNumber || "N/A"})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: "Supplier registered successfully", supplier });
  } catch (error) {
    console.error("Supplier register error:", error);
    return res.status(500).json({ success: false, message: "Server error creating supplier" });
  }
});

/**
 * GET /api/inventory/suppliers
 * List suppliers.
 * Access: Admin, Pharmacist
 */
router.get("/suppliers", protect, restrictTo("Admin", "Pharmacist"), async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    return res.json({ success: true, count: suppliers.length, suppliers });
  } catch (error) {
    console.error("Supplier listing error:", error);
    return res.status(500).json({ success: false, message: "Server error listing suppliers" });
  }
});

export default router;
