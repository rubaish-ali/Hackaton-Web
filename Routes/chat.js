
import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

const MODEL = "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `
You are Nexora AI, a helpful assistant for people in Pakistan.

Help with education, employment, public services,
waste management, water conservation, transport,
accessibility and community development.

Reply in the user's preferred language, including
simple English or Roman Urdu.

Give clear, practical and concise answers.
Do not invent official contacts, laws or statistics.
Do not claim that a complaint has been officially submitted.
`;

router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Nexora AI chat route is running.",
    provider: "Groq",
    model: MODEL,
  });
});

router.post("/", async (req, res) => {
  const requestId = Date.now().toString(36);

  try {
    const { message, history = [] } = req.body || {};

    console.log(`[${requestId}] Chat request received.`);

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing.");

      return res.status(500).json({
        success: false,
        message: "GROQ_API_KEY Backend .env mein missing hai.",
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your message.",
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message 5000 characters se chhota rakho.",
      });
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 30000,
      maxRetries: 0,
    });

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "model", "assistant"].includes(item.role) &&
              typeof item.text === "string" &&
              item.text.trim()
          )
          .slice(-8)
          .map((item) => ({
            role:
              item.role === "model" ? "assistant" : item.role,
            content: item.text.slice(0, 3000),
          }))
      : [];

    console.log(`[${requestId}] Sending request to Groq: ${MODEL}`);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...safeHistory,
        {
          role: "user",
          content: message.trim(),
        },
      ],
      max_tokens: 512,
    });

    const reply = completion.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        success: false,
        message: "AI ne empty response diya. Dobara try karo.",
      });
    }

    console.log(`[${requestId}] Groq response received.`);

    return res.status(200).json({
      success: true,
      reply: reply.trim(),
    });
  } catch (error) {
    console.error(`[${requestId}] Groq API error:`, {
      status: error.status,
      message: error.message,
      code: error.code,
    });

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: "Groq ki free request limit poori ho gayi hai. Baad mein try karo.",
      });
    }

    if (error.status === 401 || error.status === 403) {
      return res.status(error.status).json({
        success: false,
        message: "Groq API key invalid hai ya access available nahi hai.",
      });
    }

    if (error.status === 400 || error.status === 404) {
      return res.status(error.status).json({
        success: false,
        message: "Model ya request configuration check karo.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Groq API request failed. Backend terminal check karo.",
    });
  }
});

export default router;
