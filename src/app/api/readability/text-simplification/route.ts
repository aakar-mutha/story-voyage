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

    const simplificationPrompt = `Simplify this children's story text for better readability at different levels.
    
    Original text: "${pageText}"
    Current reading level: ${readingLevel}
    Child age: ${childAge}
    
    Create simplified versions with:
    - Shorter sentences
    - Simpler vocabulary
    - Clearer structure
    - Age-appropriate language
    
    IMPORTANT: Return ONLY valid JSON in this exact format:
    {
      "simplifiedVersions": {
        "verySimple": "Simplest version for struggling readers",
        "simple": "Simplified version for average readers",
        "enhanced": "Enhanced version with better flow",
        "original": "${pageText}"
      },
      "readabilityScores": {
        "fleschKincaid": 3.2,
        "gradeLevel": "3rd grade",
        "difficulty": "easy"
      },
      "improvements": [
        "Shortened sentences",
        "Simplified vocabulary",
        "Added transitions"
      ]
    }`;

    const simplificationResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: simplificationPrompt,
    });

    const simplificationData = simplificationResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const simplificationJson = extractJsonFromText(simplificationData);
    
    if (simplificationJson) {
      return NextResponse.json({
        bookId,
        feature: "text_simplification",
        data: simplificationJson,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn("Failed to parse text simplification JSON, using fallback");
      return NextResponse.json({
        bookId,
        feature: "text_simplification",
        data: {
          simplifiedVersions: {
            verySimple: "Simple version of the story for easy reading",
            simple: "A bit more detailed but still easy to read",
            enhanced: "Enhanced version with better flow and vocabulary",
            original: pageText
          },
          readabilityScores: {
            fleschKincaid: 3.2,
            gradeLevel: "3rd grade",
            difficulty: "easy"
          },
          improvements: [
            "Shortened sentences",
            "Simplified vocabulary",
            "Added transitions"
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
