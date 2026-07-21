import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Secret key
const JWT_SECRET = process.env.JWT_SECRET || "subhan-care-hms-secret-key-12345";

/**
 * Protect middleware to authenticate requests.
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-passwordHash");
      
      if (!req.user || req.user.status === "Inactive") {
        return res.status(401).json({ success: false, message: "Unauthorized - User account is inactive or not found" });
      }

      next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res.status(401).json({ success: false, message: "Unauthorized - Token verification failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized - No auth token provided" });
  }
};

/**
 * Role restriction middleware.
 * @param {...string} allowedRoles
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden - Access denied. Required roles: [${allowedRoles.join(", ")}]`,
      });
    }
    next();
  };
};
