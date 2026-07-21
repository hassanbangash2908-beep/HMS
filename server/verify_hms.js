import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Patient from "./models/Patient.js";
import Doctor from "./models/Doctor.js";
import Staff from "./models/Staff.js";
import Appointment from "./models/Appointment.js";
import Consultation from "./models/Consultation.js";
import Prescription from "./models/Prescription.js";
import Invoice from "./models/Invoice.js";
import InventoryItem from "./models/InventoryItem.js";
import Supplier from "./models/Supplier.js";
import AuditLog from "./models/AuditLog.js";

dotenv.config();

console.log("🔍  Verifying HMS Backend Models...");

const models = [
  { name: "User", model: User },
  { name: "Patient", model: Patient },
  { name: "Doctor", model: Doctor },
  { name: "Staff", model: Staff },
  { name: "Appointment", model: Appointment },
  { name: "Consultation", model: Consultation },
  { name: "Prescription", model: Prescription },
  { name: "Invoice", model: Invoice },
  { name: "InventoryItem", model: InventoryItem },
  { name: "Supplier", model: Supplier },
  { name: "AuditLog", model: AuditLog },
];

let errors = 0;

models.forEach((m) => {
  if (m.model && m.model.modelName === m.name) {
    console.log(`✅  Model [${m.name}] compiled and loaded successfully.`);
  } else {
    console.error(`❌  Model [${m.name}] failed compilation check.`);
    errors++;
  }
});

if (errors === 0) {
  console.log("\n🚀  All 11 HMS Mongoose models compiled and verified successfully!");
  process.exit(0);
} else {
  console.error(`\n❌  Verification failed with ${errors} error(s).`);
  process.exit(1);
}
