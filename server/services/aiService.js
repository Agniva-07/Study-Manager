const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ⏳ delay helper with exponential backoff
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// 📊 exponential backoff calculator
function getBackoffDelay(retryCount, baseDelay = 1000) {
  // 1s, 2s, 4s, 8s, 16s (max)
  return Math.min(baseDelay * Math.pow(2, retryCount), 16000);
}

// 🧠 fallback roadmap (production-grade)
function buildFallbackRoadmap(goal, dailyTime, durationWeeks) {
  const safeGoal = typeof goal === 'string' && goal.trim() ? goal.trim() : 'Your goal';
  const safeWeeks = Math.max(1, Math.min(Number(durationWeeks) || 4, 12)); // Cap at 12 weeks
  const safeDaily = Math.max(15, Math.min(Number(dailyTime) || 60, 480)); // Cap at 8 hours

  // More varied topics for fallback
  const templates = {
    fundamentals: [
      { name: `${safeGoal}: Core Concepts`, difficulty: 'easy' },
      { name: `${safeDaily} min focused practice`, difficulty: 'medium' },
      { name: `Review & Consolidate`, difficulty: 'medium' },
    ],
    intermediate: [
      { name: `${safeGoal}: Intermediate Topics`, difficulty: 'medium' },
      { name: `Problem-solving exercises`, difficulty: 'medium' },
      { name: `Build mini-project`, difficulty: 'medium' },
    ],
    advanced: [
      { name: `${safeGoal}: Advanced Concepts`, difficulty: 'hard' },
      { name: `Build & Deploy`, difficulty: 'hard' },
      { name: `Code review & Optimization`, difficulty: 'hard' },
    ],
  };

  return {
    weeks: Array.from({ length: safeWeeks }, (_, i) => {
      let template;
      if (i === 0) template = templates.fundamentals;
      else if (i < safeWeeks - 1) template = templates.intermediate;
      else template = templates.advanced;

      return {
        week: i + 1,
        title: `Week ${i + 1}`,
        topics: template.map(t => ({ ...t })), // Deep copy
      };
    }),
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

// 🚀 AGGRESSIVE RETRY WITH EXPONENTIAL BACKOFF
async function generateWithRetry(model, prompt, maxRetries = 5) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Set a request timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const result = await model.generateContent(prompt);
      clearTimeout(timeoutId);

      console.log(`✅ Gemini responded successfully on attempt ${attempt + 1}`);
      return result;
    } catch (err) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      const status = err?.status;

      console.error(`❌ Attempt ${attempt + 1} failed:`, {
        status,
        message: errorMsg.substring(0, 100),
        isRetryable: status === 503 || errorMsg.includes('503') || errorMsg.includes('timeout'),
      });

      // Check if error is retryable
      const isRetryable = 
        status === 503 || 
        errorMsg.includes('503') || 
        errorMsg.includes('timeout') ||
        errorMsg.includes('Service Unavailable') ||
        errorMsg.includes('temporarily unavailable');

      if (!isRetryable) {
        console.error('⚠️ Non-retryable error – giving up:', errorMsg);
        throw err;
      }

      if (attempt < maxRetries) {
        const waitTime = getBackoffDelay(attempt);
        console.log(`🔁 Retrying after ${waitTime}ms (attempt ${attempt + 2}/${maxRetries + 1})...`);
        await delay(waitTime);
      }
    }
  }

  console.error('💥 All retries exhausted – falling back');
  throw lastError;
}

// 🎯 MAIN FUNCTION
async function generateRoadmap(goal, dailyTime, durationWeeks) {
  console.log('🔥 generateRoadmap called', {
    durationWeeks,
    dailyTime,
    goalLen: typeof goal === 'string' ? goal.length : 0,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });

  // If no API key, return fallback immediately
  if (!genAI) {
    console.warn('⚠️ GEMINI_API_KEY missing – returning fallback roadmap');
    return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  const prompt = `You are a highly structured study planner AI.

Create a ${durationWeeks}-week roadmap for:
Goal: ${goal}
Daily Study Time: ${dailyTime} minutes

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "weeks": [
    {
      "week": 1,
      "title": "Week theme",
      "topics": [
        {
          "name": "topic name",
          "difficulty": "easy"
        }
      ]
    }
  ]
}

Requirements:
- 3-5 topics per week
- Gradually increase difficulty
- Be specific and practical
- Topics must be actionable`;

  try {
    // Try Gemini with aggressive retry
    const result = await generateWithRetry(model, prompt, 5);
    const response = result.response;

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text).join('');

    console.log(`📊 Gemini response: ${text.length} chars`);

    const parsed = safeJsonExtract(text);

    // Validate response
    if (!parsed || !Array.isArray(parsed.weeks) || parsed.weeks.length === 0) {
      console.warn('⚠️ Invalid Gemini JSON – using fallback');
      return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
    }

    console.log('✅ Gemini response valid – returning');
    return parsed;

  } catch (err) {
    console.error('💥 AI Service Error (final):', err.message);
    console.log('📋 Returning enhanced fallback roadmap');
    return buildFallbackRoadmap(goal, dailyTime, durationWeeks);
  }
}

module.exports = { generateRoadmap };