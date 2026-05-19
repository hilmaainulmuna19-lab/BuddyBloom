import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, context, history } = req.body;
    
    // Default context for the cute assistant
    const systemInstruction = `You are "Kawan", a super cute, helpful, and supportive personal assistant for time and money management. 
    Your personality is soft, encouraging, and "lucu" (cute). Use friendly language.
    You help users with health, motivation, financial saving, and emotional wellbeing through journaling.
    When users ask about money, give practical saving advice.
    When users ask about habits, encourage them to stay consistent.
    When users share their feelings or talk about their day, encourage them to use the "Journal" feature to reflect and track their mood (happy, sad, flat, angry, love).
    Always prioritize the user's wellbeing and mental health.
    
    User context: ${context || "No specific context provided."}`;

    const contents = history || [];
    contents.push({ parts: [{ text: message }] });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Healthy/Quotes Daily Endpoint
app.get("/api/daily-insight", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a short, motivational quote from a philosopher or famous figure related to self-development and self-worth. Format: 'Quote' - Figure. Keep it inspiring and deep.",
      config: {
        systemInstruction: "You are a wise and supportive assistant. Provide a deep, meaningful quote for the day to inspire growth.",
      }
    });
    res.json({ quote: response.text.trim() });
  } catch (error: any) {
    res.json({ quote: "\"Knowing yourself is the beginning of all wisdom.\" - Aristotle" });
  }
});

// Health/Motivation Tips Endpoint
app.get("/api/tips", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate 3 short, cute tips for health or financial saving. Return as a JSON array of strings.",
      config: {
        responseMimeType: "application/json",
      }
    });
    res.json({ tips: JSON.parse(response.text) });
  } catch (error: any) {
    res.json({ tips: ["Minum air putih ya!", "Catat pengeluaranmu hari ini!", "Jangan lupa istirahat!"] });
  }
});

// Mood Analysis Endpoint
app.post("/api/mood-analysis", async (req, res) => {
  try {
    const { journals } = req.body;
    
    if (!journals || journals.length === 0) {
      return res.json({ analysis: "Belum ada cukup data jurnal untuk dianalisis. Terus menulis ya!" });
    }

    const journalText = journals.map((j: any) => `Date: ${j.date}, Mood: ${j.mood}, Content: ${j.content}`).join("\n---\n");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these journal entries from the past month and provide a short summary of the user's most frequent mood and any significant emotional shifts. Keep it supportive and insightful.\n\n${journalText}`,
      config: {
        systemInstruction: "You are an empathetic psychologist and friend. Provide deep emotional insights based on the journal data provided.",
      }
    });
    res.json({ analysis: response.text.trim() });
  } catch (error: any) {
    console.error("Mood Analysis Error:", error);
    res.json({ analysis: "Maaf, Kawan tidak bisa menganalisis moodmu saat ini. Mari coba lagi nanti!" });
  }
});

// Journal Buddy Endpoint (Daily Journal Analysis)
app.post("/api/journal-buddy", async (req, res) => {
  try {
    const { content, mood } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const prompt = `User's current mood: ${mood}\n\nUser's journal content: "${content}"\n\nBased on this, please provide:\n1. A short, empathetic reflection (1-2 sentences).\n2. A song suggestion that matches this vibe (Format: "Song Title" - Artist).\n3. A short motivational quote or affirmation for the user.\n\nReturn the response in JSON format like this: { "reflection": "...", "song_suggestion": "...", "affirmation": "..." }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an empathetic, wise, and supportive digital companion named 'Kawan'. You provide comfort and musical therapy suggestions.",
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Journal Buddy Error:", error);
    res.status(500).json({ error: "Gagal mendapatkan inspirasi AI." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
