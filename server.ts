import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

app.post('/api/generate-diagram', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Generation Failed:", error);
    res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3001 : 5000;
const HOST = isDev ? 'localhost' : '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
});
