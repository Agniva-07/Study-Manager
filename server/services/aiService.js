const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateRoadmap(goal, dailyTime, durationWeeks) {
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
    // 2. Wrapped the API call in the try/catch to handle network/404 errors
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanText = text.replace(/```json|```/g, "").trim();
    
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("AI Service Error:", err.message);
    return { error: "Failed to generate roadmap. Please check the server logs." };
  }
}

module.exports = { generateRoadmap };