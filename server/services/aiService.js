const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ⏳ delay helper
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// 🧠 fallback
function buildFallbackRoadmap(goal, dailyTime, durationWeeks) {
  const safeGoal = typeof goal === 'string' && goal.trim() ? goal.trim() : 'Your goal';
  const safeWeeks = Math.max(1, Number(durationWeeks) || 4);
  const safeDaily = Math.max(15, Number(dailyTime) || 60);

  return {
    weeks: Array.from({ length: safeWeeks }, (_, i) => ({
      week: i + 1,
      title: `Week ${i + 1}`,
      topics: [
        { name: `${safeGoal}: fundamentals`, difficulty: i === 0 ? 'easy' : 'medium' },
        { name: `${safeDaily} min focused practice`, difficulty: 'medium' },
        { name: `${safeGoal}: build + review`, difficulty: i >= 2 ? 'hard' : 'medium' },
      ],
    })),
  };
}

// 🧼 safe JSON parser
function safeJsonExtract(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);

  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// 🚀 SMART RETRY WITH DELAY
async function generateWithRetry(model, prompt, retries = 2) {
  try {
    return await model.generateContent(prompt);
  } catch (err) {
    console.log("Gemini error:", err.message);

    // 🔥 retry only for 503 (server busy)
    if ((err?.status === 503 || err.message.includes('503')) && retries > 0) {
      console.log("🔁 Retrying after delay...");
      await delay(2000); // ⏳ 2 sec wait (IMPORTANT)
      return generateWithRetry(model, prompt, retries - 1);
    }

    throw err;
  }
}

// 🎯 MAIN FUNCTION
async function generateRoadmap(goal, dailyTime, durationWeeks) {
  console.log('🔥 generateRoadmap called', {
    durationWeeks,
    dailyTime,
    goalLen: typeof goal === 'string' ? goal.length : 0,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });

  if (!genAI) {
    console.warn('GEMINI_API_KEY missing – returning fallback roadmap.');
    return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  const prompt = `
You are a highly structured study planner AI.

Create a ${durationWeeks}-week roadmap for:
Goal: ${goal}
Daily Study Time: ${dailyTime} minutes

Return ONLY JSON in this format:
{
  "weeks": [
    {
      "week": 1,
      "title": "Week theme",
      "topics": [
        {
          "name": "topic name",
          "difficulty": "easy/medium/hard"
        }
      ]
    }
  ]
}

Keep it progressive and practical.
`;

  try {
    const result = await generateWithRetry(model, prompt);
    const response = result.response;

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text).join('');

    console.log('Gemini response length:', text.length);

    const parsed = safeJsonExtract(text);

    if (!parsed || !Array.isArray(parsed.weeks)) {
      console.warn('Invalid JSON – using fallback');
      return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
    }

    return parsed;

  } catch (err) {
    console.error('AI Service Error:', err.message);
    return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
  }
}

module.exports = { generateRoadmap };