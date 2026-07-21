import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["Receptionist", "Pharmacist", "Billing Staff"],
      required: true,
    },
    contactInfo: {
      type: String,
      required: true,
      trim: true,
    },
    shiftTiming: {
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

// Pre-save hook to auto-generate staffId (format: SC-STF-#####)
staffSchema.pre("save", async function (next) {
  if (this.isNew && !this.staffId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const tempId = `SC-STF-${randomNum}`;
      const existing = await mongoose.model("Staff").findOne({ staffId: tempId });
      if (!existing) {
        this.staffId = tempId;
        unique = true;
      }
      attempts++;
    }
    if (!unique) {
      const count = await mongoose.model("Staff").countDocuments();
      this.staffId = `SC-STF-${String(count + 1).padStart(5, "0")}`;
    }
  }
  next();
});

const Staff = mongoose.model("Staff", staffSchema);
export default Staff;
