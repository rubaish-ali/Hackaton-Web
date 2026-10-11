
import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";

import authRoutes from "./Routes/auth.js";
import chatRoutes from "./Routes/chat.js";
import resumeRoutes from "./Routes/resume.js";
import scamShieldRoutes from "./Routes/scamShield.js";

// DNS configuration for MongoDB/network resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON
app.use(express.json({ limit: "1mb" }));

// Backend health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Nexora backend is running!",
  });
});

// ScamShield health check
app.get("/api/scamshield/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ScamShield route is available.",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected",
    geminiConfigured: Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_MODEL
    ),
  });
});

// Existing routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/scamshield", scamShieldRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("[Backend] Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error."
        : error.message,
  });
});

// Start server after connecting to MongoDB

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}


startServer();
