import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      type: String,
      required: true,
      trim: true,
    },
    supplierAddress: {
      type: String,
      trim: true,
    },
    supplierPhone: {
      type: String,
      trim: true,
    },
    supplierEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    ntnNumber: {
      type: String, // National Tax Number for Pakistan-based invoice compliance (FR-07.6)
      trim: true,
    },
    purchaseOrderHistory: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate supplierId (format: SC-SUP-#####)
supplierSchema.pre("save", async function (next) {
  if (this.isNew && !this.supplierId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-SUP-${randomNum}`;
      const existing = await mongoose.model("Supplier").findOne({ supplierId: tempId });
      if (!existing) {
        this.supplierId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Supplier").countDocuments();
      this.supplierId = `SC-SUP-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
