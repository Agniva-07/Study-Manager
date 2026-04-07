const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateRoadmap(goal, dailyTime, durationWeeks) {
  console.log("🔥 FUNCTION CALLED");
  // 1. Updated to a supported model version
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash" 
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
    const result = await model.generateContent(prompt);
    const response = result.response;

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Empty or invalid AI response');
    }

    const cleanText = text.replace(/```json|```/g, "").trim();
    if (!cleanText) {
      throw new Error('Empty AI response content');
    }

    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      throw new Error("Invalid JSON from AI");
    }
  } catch (err) {
    console.error("AI Service Error:", err.message);
    throw new Error("Failed to generate roadmap");
  }
}

module.exports = { generateRoadmap };