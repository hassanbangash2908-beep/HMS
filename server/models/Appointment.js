import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
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
    date: {
      type: Date,
      required: true, // format "YYYY-MM-DD"
    },
    timeSlot: {
      type: String,
      required: true, // format e.g., "09:00 - 09:30"
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "No-Show"],
      default: "Scheduled",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate appointmentId (format: SC-APT-#####)
appointmentSchema.pre("save", async function (next) {
  if (this.isNew && !this.appointmentId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-APT-${randomNum}`;
      const existing = await mongoose.model("Appointment").findOne({ appointmentId: tempId });
      if (!existing) {
        this.appointmentId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Appointment").countDocuments();
      this.appointmentId = `SC-APT-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
