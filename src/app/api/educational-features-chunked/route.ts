import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12),
  city: z.string(),
  feature: z.enum([
    "comprehension_quiz",
    "vocabulary_builder", 
    "cultural_facts",
    "activity_suggestions"
  ])
});

const MODEL_TEXT = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

function extractJsonFromText(text: string): Record<string, unknown> | null {
  try {
    const patterns = [
      /\{[\s\S]*\}/,
      /```json\s*(\{[\s\S]*?\})\s*```/i,
      /```\s*(\{[\s\S]*?\})\s*```/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr);
      }
    }
    
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
    
    const { bookId: _bookId, pageText, readingLevel, childAge, city, feature } = parsed.data; // eslint-disable-line @typescript-eslint/no-unused-vars
    const ai = new GoogleGenAI({ apiKey });

    let result: Record<string, unknown> = {};

    switch (feature) {
      case "comprehension_quiz":
        result = await generateComprehensionQuiz(ai, pageText, readingLevel, childAge);
        break;
      case "vocabulary_builder":
        result = await generateVocabularyBuilder(ai, pageText, readingLevel, childAge);
        break;
      case "cultural_facts":
        result = await generateCulturalFacts(ai, pageText, city, childAge);
        break;
      case "activity_suggestions":
        result = await generateActivitySuggestions(ai, pageText, readingLevel, childAge);
        break;
      default:
        return NextResponse.json({ error: "Invalid feature" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      feature,
      data: result,
      timestamp: Date.now()
    });

  } catch (err: unknown) {
    console.error("Educational features chunked error:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}

async function generateComprehensionQuiz(ai: GoogleGenAI, pageText: string, readingLevel: string, childAge: number) {
  const prompt = `Create a quick reading comprehension quiz for this children's story page. 
  
  Story text: "${pageText}"
  Reading level: ${readingLevel}
  Child age: ${childAge}
  
  Generate 2-3 age-appropriate questions that test understanding. Keep it simple and fast.
  
  Return ONLY valid JSON:
  {
    "questions": [
      {
        "question": "What is the main character doing?",
        "options": ["A) Playing", "B) Reading", "C) Sleeping", "D) Exploring"],
        "correct": "D",
        "explanation": "The story shows the character exploring."
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
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

async function generateVocabularyBuilder(ai: GoogleGenAI, pageText: string, readingLevel: string, childAge: number) {
  const prompt = `Create a quick vocabulary builder for this children's story page.
  
  Story text: "${pageText}"
  Reading level: ${readingLevel}
  Child age: ${childAge}
  
  Identify 2-3 challenging words and provide simple definitions and examples.
  
  Return ONLY valid JSON:
  {
    "vocabulary": [
      {
        "word": "adventure",
        "definition": "An exciting journey",
        "example": "Going to the zoo was a great adventure!",
        "visual": "Think of exploring a new place"
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
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

async function generateCulturalFacts(ai: GoogleGenAI, pageText: string, city: string, childAge: number) {
  const prompt = `Create quick cultural facts related to this story and the city ${city}.
  
  Story text: "${pageText}"
  Child age: ${childAge}
  
  Provide 2-3 interesting cultural facts that connect to the story.
  
  Return ONLY valid JSON:
  {
    "culturalFacts": [
      {
        "fact": "In Paris, people often say 'Bonjour' when greeting each other.",
        "category": "Language",
        "funElement": "Try saying 'Bonjour' to your friends!"
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
    culturalFacts: [
      {
        fact: `In ${city}, there are many interesting places to explore!`,
        category: "Geography",
        funElement: "Can you find this city on a map?"
      }
    ]
  };
}

async function generateActivitySuggestions(ai: GoogleGenAI, pageText: string, readingLevel: string, childAge: number) {
  const prompt = `Create quick activity suggestions based on this story.
  
  Story text: "${pageText}"
  Reading level: ${readingLevel}
  Child age: ${childAge}
  
  Suggest 2-3 simple activities that connect to the story.
  
  Return ONLY valid JSON:
  {
    "activities": [
      {
        "title": "Draw the Main Character",
        "description": "Draw what you think the main character looks like",
        "materials": "Paper and crayons",
        "learningObjective": "Creative expression and comprehension"
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
    activities: [
      {
        title: "Draw the Story",
        description: "Draw your favorite part of the story",
        materials: "Paper and crayons",
        learningObjective: "Creative expression and comprehension"
      }
    ]
  };
}
