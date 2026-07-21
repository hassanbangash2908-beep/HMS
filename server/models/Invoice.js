import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      unique: true,
      sparse: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    itemizedCharges: [
      {
        item: {
          type: String,
          required: true, // e.g. "Consultation Fee", "Amoxicillin 500mg"
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "Bank Transfer", "Credit Note"],
      default: "Cash",
    },
    status: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid", "Refunded"],
      default: "Unpaid",
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isCreditNote: {
      type: Boolean,
      default: false,
    },
    linkedOriginalInvoiceId: {
      type: String, // References the invoiceId string of the original invoice
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate invoiceId (format: SC-INV-#####)
invoiceSchema.pre("save", async function (next) {
  if (this.isNew && !this.invoiceId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = this.isCreditNote ? `SC-CRN-${randomNum}` : `SC-INV-${randomNum}`;
      const existing = await mongoose.model("Invoice").findOne({ invoiceId: tempId });
      if (!existing) {
        this.invoiceId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Invoice").countDocuments();
      this.invoiceId = this.isCreditNote 
        ? `SC-CRN-${String(count + 1).padStart(5, "0")}` 
        : `SC-INV-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
