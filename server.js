
import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";

import authRoutes from "./Routes/auth.js";
import chatRoutes from "./Routes/chat.js";
import resumeRoutes from "./Routes/resume.js";
import scamShieldRoutes from "./Routes/scamShield.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend domains
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://frontend-git-main-danger-rubs-projects.vercel.app",
  "https://frontend-beige-kappa-72.vercel.app",
  "https://frontend-q7oir01k1-danger-rubs-projects.vercel.app",
  "https://frontend-zwdw.vercel.app",
];

// CORS must be before API routes
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked origin:", origin);
      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "1mb" }));

// Root health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Nexora Backend is running.",
  });
});

// Database connection
let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => {
        console.log("MongoDB connected successfully");
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

// Connect to MongoDB before handling API requests
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection failed. Please try again later.",
    });
  }
});

// Health check for database and Gemini configuration
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// API routes
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

// General error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

// Local development server
// On Vercel, export the app for the platform to handle requests.
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexora backend running on port ${PORT}`);
  });
}

export default app;
