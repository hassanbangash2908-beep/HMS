import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing values until generated
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    cnic: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContact: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContactRelationship: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    allergies: [
      {
        type: String,
      },
    ],
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
    },
    occupation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-generate patientId (format: SC-PAT-#####)
patientSchema.pre("save", async function (next) {
  if (this.isNew && !this.patientId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-PAT-${randomNum}`;
      const existing = await mongoose.model("Patient").findOne({ patientId: tempId });
      if (!existing) {
        this.patientId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Patient").countDocuments();
      this.patientId = `SC-PAT-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;
