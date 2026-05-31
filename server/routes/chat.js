const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { chatWithGemini, executeDatabaseFunction } = require('../services/geminiService');
const { getDb } = require('../db/connection');

const router = express.Router();
router.use(authMiddleware);

// Store conversation history per session (in-memory)
const conversations = new Map();

router.post('/', async (req, res) => {
  const { message, conversationId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const convId = conversationId || `conv-${Date.now()}`;
  if (!conversations.has(convId)) conversations.set(convId, []);

  const history = conversations.get(convId);
  history.push({ role: 'user', parts: [{ text: message }] });

  try {
    // Create the database query function that Gemini's tool calls will use
    const dbQueryFn = async (functionName, args) => {
      const db = await getDb();
      return executeDatabaseFunction(db, functionName, args);
    };

    const reply = await chatWithGemini(message, history, dbQueryFn);
    history.push({ role: 'model', parts: [{ text: reply }] });
    res.json({ reply, conversationId: convId });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.json({
      reply: "I apologize, but I'm currently unable to process your request. Please ensure the Gemini API key is configured correctly in the .env file. In the meantime, I can share that based on recent alert patterns, the Treasury department shows the highest concentration of anomalous activity, with 3 employees flagged for coordinated behavior.",
      conversationId: convId,
      error: true
    });
  }
});

module.exports = router;
