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
    // 2. Wrapped the API call in the try/catch to handle network/404 errors
    const result = await model.generateContent(prompt);
    const response = result.response;

    console.log("FULL RESPONSE:", JSON.stringify(response, null, 2));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    const cleanText = text.replace(/```json|```/g, "").trim();
    
    console.log("AI Raw Response:", text);
    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", cleanText);
      throw new Error("Invalid JSON from AI");
    }
  } catch (err) {
    console.error("AI Service Error:", err.message);
    return { error: "Failed to generate roadmap. Please check the server logs." };
  }
}

module.exports = { generateRoadmap };