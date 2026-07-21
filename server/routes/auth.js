import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { logActivity } from "../middleware/audit.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "subhan-care-hms-secret-key-12345";

// Password complexity regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

/**
 * Helper to validate password complexity.
 */
function isPasswordComplex(password) {
  return PASSWORD_REGEX.test(password);
}

/**
 * POST /api/auth/register
 * Admin or Initial Registration Setup.
 */
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    if (!username || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Please fill in all fields" });
    }

    if (!isPasswordComplex(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase and lowercase letters, a number, and a special character.",
      });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      passwordHash,
      role,
    });

    await user.save();

    await logActivity({
      userId: user._id,
      username: user.username,
      action: "USER_REGISTER",
      affectedEntity: "User",
      affectedRecordId: user._id.toString(),
      details: `Registered new account with role: ${role}`,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

/**
 * POST /api/auth/login
 * User login.
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please provide credentials" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({ success: false, message: "Your account is deactivated" });
    }

    // Check lock status
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMin = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${remainingMin} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      // Increment failed login count
      user.failedLoginAttempts += 1;
      let message = "Invalid username or password";
      
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 mins
        user.failedLoginAttempts = 0; // reset attempts
        message = "Account locked for 15 minutes due to 5 consecutive failed login attempts.";
      }
      
      await user.save();

      await logActivity({
        userId: user._id,
        username: user.username,
        action: "LOGIN_FAILED",
        affectedEntity: "User",
        affectedRecordId: user._id.toString(),
        details: `Failed login attempt. Count: ${user.failedLoginAttempts}`,
        ipAddress,
      });

      return res.status(401).json({ success: false, message });
    }

    // Reset lock/attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    await logActivity({
      userId: user._id,
      username: user.username,
      action: "USER_LOGIN",
      affectedEntity: "User",
      affectedRecordId: user._id.toString(),
      details: "User logged in successfully",
      ipAddress,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        linkedEntityId: user.linkedEntityId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request OTP/reset token.
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't disclose that the user does not exist
      return res.json({
        success: true,
        message: "If a matching email exists, a password reset OTP has been sent.",
      });
    }

    // Generate a 6 digit code
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    await logActivity({
      userId: user._id,
      username: user.username,
      action: "PASSWORD_RESET_REQUESTED",
      affectedEntity: "User",
      affectedRecordId: user._id.toString(),
      details: "Requested password reset code",
    });

    // In local dev, we return the OTP code directly so developer/tester can reset
    return res.json({
      success: true,
      message: "If a matching email exists, a password reset OTP has been sent.",
      dev_code: otp, // Back-channel for development verification
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP.
 */
router.post("/reset-password", async (req, res) => {
  const { otp, newPassword } = req.body;

  try {
    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, message: "OTP and new password are required" });
    }

    if (!isPasswordComplex(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase and lowercase letters, a number, and a special character.",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await logActivity({
      userId: user._id,
      username: user.username,
      action: "PASSWORD_RESET_SUCCESS",
      affectedEntity: "User",
      affectedRecordId: user._id.toString(),
      details: "Successfully reset password via OTP",
    });

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
