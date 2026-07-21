import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    quantityInStock: {
      type: Number,
      required: true,
      min: [0, "Stock quantity cannot be reduced below zero"], // IR-06 constraint
      default: 0,
    },
    reorderThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate itemId (format: SC-ITM-#####)
inventoryItemSchema.pre("save", async function (next) {
  if (this.isNew && !this.itemId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-ITM-${randomNum}`;
      const existing = await mongoose.model("InventoryItem").findOne({ itemId: tempId });
      if (!existing) {
        this.itemId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("InventoryItem").countDocuments();
      this.itemId = `SC-ITM-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
export default InventoryItem;
