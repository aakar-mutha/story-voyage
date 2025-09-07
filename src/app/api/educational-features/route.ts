import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12),
  city: z.string(),
  features: z.array(z.enum([
    "comprehension_quiz",
    "vocabulary_builder", 
    "cultural_facts",
    "reading_guide",
    "activity_suggestions"
  ])).default(["comprehension_quiz", "vocabulary_builder"])
});

const MODEL_TEXT = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

function extractJsonFromText(text: string): Record<string, unknown> | null {
  try {
    // Try to find JSON in various formats
    const patterns = [
      /\{[\s\S]*\}/,  // Basic JSON object
      /```json\s*(\{[\s\S]*?\})\s*```/i,  // JSON in code block
      /```\s*(\{[\s\S]*?\})\s*```/i,  // JSON in generic code block
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr);
      }
    }
    
    // Try parsing the entire text as JSON
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_GENAI_API_KEY" }, { status: 500 });
    }
    
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { bookId, pageText, readingLevel, childAge, city, features } = parsed.data;
    const ai = new GoogleGenAI({ apiKey });

    const educationalContent: Record<string, unknown> = {};

    // Generate comprehension quiz
    if (features.includes("comprehension_quiz")) {
      const quizPrompt = `Create a reading comprehension quiz for this children's story page. 
      
      Story text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Generate 3-5 age-appropriate questions that test understanding, inference, and critical thinking. 
      Include multiple choice answers and explanations.
      
      IMPORTANT: Return ONLY valid JSON in this exact format, no other text:
      {
        "questions": [
          {
            "question": "What is the main character doing?",
            "options": ["A) Playing", "B) Reading", "C) Sleeping", "D) Eating"],
            "correct": "A",
            "explanation": "The text clearly states the character is playing in the garden."
          }
        ]
      }`;

      const quizResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: quizPrompt,
      });

      const quizText = quizResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const quizData = extractJsonFromText(quizText);
      
      if (quizData) {
        educationalContent.comprehensionQuiz = quizData;
      } else {
        console.warn("Failed to parse quiz JSON, using fallback");
        educationalContent.comprehensionQuiz = {
          questions: [
            {
              question: "What is the main character doing in this story?",
              options: ["A) Playing", "B) Reading", "C) Sleeping", "D) Exploring"],
              correct: "D",
              explanation: "The story shows the character exploring and having adventures."
            }
          ]
        };
      }
    }

    // Generate vocabulary builder
    if (features.includes("vocabulary_builder")) {
      const vocabPrompt = `Create a vocabulary builder for this children's story page.
      
      Story text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Identify 3-5 challenging or interesting words from the text and provide:
      - Simple definitions
      - Example sentences
      - Visual descriptions for better understanding
      
      IMPORTANT: Return ONLY valid JSON in this exact format, no other text:
      {
        "vocabulary": [
          {
            "word": "adventure",
            "definition": "An exciting journey or experience",
            "example": "Going to the zoo was a great adventure!",
            "visual": "Think of exploring a new place with excitement"
          }
        ]
      }`;

      const vocabResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: vocabPrompt,
      });

      const vocabText = vocabResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const vocabData = extractJsonFromText(vocabText);
      
      if (vocabData) {
        educationalContent.vocabularyBuilder = vocabData;
      } else {
        console.warn("Failed to parse vocabulary JSON, using fallback");
        educationalContent.vocabularyBuilder = {
          vocabulary: [
            {
              word: "adventure",
              definition: "An exciting journey or experience",
              example: "Going to the zoo was a great adventure!",
              visual: "Think of exploring a new place with excitement"
            }
          ]
        };
      }
    }

    // Generate cultural facts
    if (features.includes("cultural_facts")) {
      const culturalPrompt = `Create cultural learning content about ${city} for children.
      
      Child age: ${childAge}
      Reading level: ${readingLevel}
      
      Provide 3-5 fun, educational facts about the city's culture, traditions, food, landmarks, or people.
      Make it engaging and age-appropriate.
      
      Return as JSON: {
        "culturalFacts": [
          {
            "fact": "In Paris, people say 'Bonjour' to greet each other",
            "category": "Language",
            "funElement": "Try saying 'Bonjour' with a French accent!"
          }
        ]
      }`;

      const culturalResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: culturalPrompt,
      });

      const culturalText = culturalResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const culturalData = extractJsonFromText(culturalText);
      
      if (culturalData) {
        educationalContent.culturalFacts = culturalData;
      } else {
        console.warn("Failed to parse cultural facts JSON, using fallback");
        educationalContent.culturalFacts = {
          culturalFacts: [
            {
              fact: `In ${city}, people have unique traditions and customs`,
              category: "Culture",
              funElement: "Try learning about local traditions!"
            }
          ]
        };
      }
    }

    // Generate reading guide
    if (features.includes("reading_guide")) {
      const guidePrompt = `Create a reading guide for parents/teachers to help children understand this story page.
      
      Story text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Provide:
      - Key themes and messages
      - Discussion questions for adults to ask
      - Tips for helping struggling readers
      - Ways to extend learning
      
      Return as JSON: {
        "readingGuide": {
          "themes": ["Friendship", "Adventure"],
          "discussionQuestions": ["What would you do in this situation?"],
          "readingTips": ["Take breaks between sentences"],
          "extensions": ["Draw a picture of the scene"]
        }
      }`;

      const guideResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: guidePrompt,
      });

      const guideText = guideResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const guideData = extractJsonFromText(guideText);
      
      if (guideData) {
        educationalContent.readingGuide = guideData;
      } else {
        console.warn("Failed to parse reading guide JSON, using fallback");
        educationalContent.readingGuide = {
          themes: ["Adventure", "Learning"],
          discussionQuestions: ["What would you do in this situation?"],
          readingTips: ["Take breaks between sentences"],
          extensions: ["Draw a picture of the scene"]
        };
      }
    }

    // Generate activity suggestions
    if (features.includes("activity_suggestions")) {
      const activityPrompt = `Create hands-on activity suggestions related to this story page.
      
      Story text: "${pageText}"
      Child age: ${childAge}
      City: ${city}
      
      Suggest 3-5 creative, educational activities that children can do at home or school.
      Include materials needed and learning objectives.
      
      Return as JSON: {
        "activities": [
          {
            "title": "Build a Mini City",
            "description": "Use blocks to recreate the city from the story",
            "materials": ["Building blocks", "Paper", "Markers"],
            "learningObjective": "Spatial reasoning and creativity"
          }
        ]
      }`;

      const activityResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: activityPrompt,
      });

      const activityText = activityResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const activityData = extractJsonFromText(activityText);
      
      if (activityData) {
        educationalContent.activities = activityData;
      } else {
        console.warn("Failed to parse activities JSON, using fallback");
        educationalContent.activities = {
          activities: [
            {
              title: "Draw the Scene",
              description: "Draw a picture of what happened in the story",
              materials: ["Paper", "Crayons", "Markers"],
              learningObjective: "Creativity and comprehension"
            }
          ]
        };
      }
    }

    return NextResponse.json({
      bookId,
      educationalContent,
      featuresGenerated: features,
      timestamp: new Date().toISOString()
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
