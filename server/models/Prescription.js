import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
    },
    medicines: [
      {
        name: {
          type: String,
          required: true,
        },
        dosage: {
          type: String,
          required: true, // e.g., "500mg"
        },
        frequency: {
          type: String,
          required: true, // e.g., "Once daily", "1-0-1"
        },
        duration: {
          type: String,
          required: true, // e.g., "5 days"
        },
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Dispensed"],
      default: "Pending",
    },
    dispensedAt: {
      type: Date,
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate prescriptionId (format: SC-RX-#####)
prescriptionSchema.pre("save", async function (next) {
  if (this.isNew && !this.prescriptionId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-RX-${randomNum}`;
      const existing = await mongoose.model("Prescription").findOne({ prescriptionId: tempId });
      if (!existing) {
        this.prescriptionId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Prescription").countDocuments();
      this.prescriptionId = `SC-RX-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);
export default Prescription;
