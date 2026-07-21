import AuditLog from "../models/AuditLog.js";

/**
 * Utility function to write an entry to the Audit Log.
 */
export const logActivity = async ({
  userId,
  username,
  action,
  affectedEntity,
  affectedRecordId,
  details,
  ipAddress,
}) => {
  try {
    const log = new AuditLog({
      userId,
      username,
      action,
      affectedEntity,
      affectedRecordId,
      details,
      ipAddress,
    });
    await log.save();
    console.log(`[AUDIT LOG] ${action} on ${affectedEntity} (ID: ${affectedRecordId}) by ${username || "System"}`);
  } catch (error) {
    console.error("Error creating audit log entry:", error.message);
  }
};
