import express from "express";

const router = express.Router();

/**
 * GET /api/hello
 * Simple health-check / greeting route.
 */
router.get("/hello", (req, res) => {
  res.json({
    success: true,
    message: "Hello from the HMS server! 👋",
    timestamp: new Date().toISOString(),
  });
});

export default router;
