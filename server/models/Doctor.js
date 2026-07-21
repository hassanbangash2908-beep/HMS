import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contactInfo: {
      type: String,
      required: true,
      trim: true,
    },
    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    schedule: {
      workingDays: [
        {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
      ],
      timeSlots: [
        {
          type: String, // format e.g. "09:00 - 09:30"
        },
      ],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate doctorId (format: SC-DOC-#####)
doctorSchema.pre("save", async function (next) {
  if (this.isNew && !this.doctorId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-DOC-${randomNum}`;
      const existing = await mongoose.model("Doctor").findOne({ doctorId: tempId });
      if (!existing) {
        this.doctorId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Doctor").countDocuments();
      this.doctorId = `SC-DOC-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
