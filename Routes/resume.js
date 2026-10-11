import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (
      file.mimetype !== "application/pdf" ||
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      return callback(new Error("Only PDF resumes are accepted."));
    }

    callback(null, true);
  },
});

router.post("/analyze", (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Resume upload failed.",
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a PDF resume.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: req.file.buffer.toString("base64"),
          },
        },
        `Review this resume for career development.

Provide:
1. A brief professional summary.
2. Skills identified in the resume.
3. Strong points.
4. Missing details or improvements.
5. Suggested roles suitable for the stated skills.
6. Three practical next steps.

Be supportive, specific and honest. Do not invent qualifications
or experience. Do not repeat unnecessary personal contact details.
Format the answer with clear headings and simple English.`,
      ],
    });

    res.json({
      message: "Resume analyzed successfully.",
      analysis: response.text || "No analysis was returned.",
    });
  } catch (error) {
    console.error("Resume analysis error:", error.message);

    res.status(500).json({
      message: "Could not analyze the resume. Please try again.",
    });
  }
});

export default router;