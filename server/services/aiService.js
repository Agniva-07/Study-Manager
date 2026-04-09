const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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

function safeJsonExtract(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim();

  const match = clean.match(/\{[\s\S]*\}/); // extract JSON block
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// 🔁 Retry wrapper for Gemini (handles 503 errors)
async function generateWithRetry(model, prompt, retries = 2) {
  try {
    return await model.generateContent(prompt);
  } catch (err) {
    console.log("Gemini error:", err.message);

    if (retries > 0) {
      console.log("🔁 Retrying Gemini...");
      return generateWithRetry(model, prompt, retries - 1);
    }

    throw err;
  }
}

async function generateRoadmap(goal, dailyTime, durationWeeks) {
  console.log('🔥 generateRoadmap called', {
    durationWeeks,
    dailyTime,
    goalLen: typeof goal === 'string' ? goal.length : 0,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });

  // If Gemini isn't configured in production, don't crash the endpoint.
  if (!genAI) {
    console.warn('GEMINI_API_KEY missing – returning fallback roadmap.');
    return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
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

    const candidateCount = Array.isArray(response?.candidates) ? response.candidates.length : 0;
    const parts = response?.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text).join('');
    console.log('Gemini response meta', {
      candidateCount,
      hasText: typeof text === 'string' && text.length > 0,
      textLen: typeof text === 'string' ? text.length : 0,
    });

    const parsed = safeJsonExtract(text);
    if (!parsed || !Array.isArray(parsed.weeks)) {
      console.warn('Gemini returned invalid JSON shape – using fallback roadmap.');
      return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
    }

    return parsed;
  } catch (err) {
    console.error('AI Service Error:', err);
    return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
  }
}

module.exports = { generateRoadmap };