import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12)
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
    
    const { bookId, pageText, readingLevel, childAge } = parsed.data;
    const ai = new GoogleGenAI({ apiKey });

    const vocabularyPrompt = `Identify and provide support for challenging vocabulary in this children's story text.
    
    Text: "${pageText}"
    Reading level: ${readingLevel}
    Child age: ${childAge}
    
    Identify words that might be challenging and provide:
    - Definitions
    - Visual cues
    - Context clues
    - Pronunciation guides
    
    IMPORTANT: Return ONLY valid JSON in this exact format:
    {
      "challengingWords": [
        {
          "word": "adventure",
          "definition": "An exciting journey or experience",
          "pronunciation": "ad-VEN-chur",
          "syllables": 3,
          "difficulty": "medium",
          "contextClue": "The word 'adventure' appears when talking about exploring new places",
          "visualCue": "Think of going on a treasure hunt or exploring a new place",
          "alternatives": ["journey", "exploration", "trip"]
        }
      ],
      "readingAids": {
        "highlightedWords": ["adventure", "discovered"],
        "glossary": {
          "adventure": "An exciting journey",
          "discovered": "Found something new"
        }
      }
    }`;

    const vocabularyResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: vocabularyPrompt,
    });

    const vocabularyData = vocabularyResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const vocabularyJson = extractJsonFromText(vocabularyData);
    
    if (vocabularyJson) {
      return NextResponse.json({
        bookId,
        feature: "vocabulary_highlighting",
        data: vocabularyJson,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn("Failed to parse vocabulary highlighting JSON, using fallback");
      return NextResponse.json({
        bookId,
        feature: "vocabulary_highlighting",
        data: {
          challengingWords: [
            {
              word: "adventure",
              definition: "An exciting journey or experience",
              pronunciation: "ad-VEN-chur",
              syllables: 3,
              difficulty: "medium",
              contextClue: "The word 'adventure' appears when talking about exploring new places",
              visualCue: "Think of going on a treasure hunt or exploring a new place",
              alternatives: ["journey", "exploration", "trip"]
            }
          ],
          readingAids: {
            highlightedWords: ["adventure", "discovered"],
            glossary: {
              "adventure": "An exciting journey",
              "discovered": "Found something new"
            }
          }
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
