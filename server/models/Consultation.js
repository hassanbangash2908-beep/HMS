import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    consultationId: {
      type: String,
      unique: true,
      sparse: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
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
    symptoms: {
      type: String,
      trim: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Draft", "Completed"],
      default: "Completed",
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate consultationId (format: SC-CNS-#####)
consultationSchema.pre("save", async function (next) {
  if (this.isNew && !this.consultationId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-CNS-${randomNum}`;
      const existing = await mongoose.model("Consultation").findOne({ consultationId: tempId });
      if (!existing) {
        this.consultationId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Consultation").countDocuments();
      this.consultationId = `SC-CNS-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Consultation = mongoose.model("Consultation", consultationSchema);
export default Consultation;
