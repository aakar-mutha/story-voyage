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

    const visualPrompt = `Create visual reading support for this children's story text.
    
    Text: "${pageText}"
    Reading level: ${readingLevel}
    Child age: ${childAge}
    
    Provide visual aids to support reading:
    - Text formatting suggestions
    - Color coding
    - Spacing recommendations
    - Font and size guidance
    
    IMPORTANT: Return ONLY valid JSON in this exact format:
    {
      "textFormatting": {
        "fontSize": "18px",
        "lineHeight": "1.6",
        "letterSpacing": "0.1em",
        "fontFamily": "Arial, sans-serif"
      },
      "colorCoding": {
        "nouns": "#FF6B6B",
        "verbs": "#4ECDC4",
        "adjectives": "#9B59B6",
        "important": "#FFA07A"
      },
      "spacing": {
        "paragraphSpacing": "1.5em",
        "wordSpacing": "0.2em",
        "sentenceSpacing": "1em"
      },
      "visualCues": [
        "Use bold for important words",
        "Italicize for emphasis",
        "Underline for new vocabulary"
      ],
      "accessibility": {
        "highContrast": true,
        "largeText": true,
        "clearSpacing": true
      }
    }`;

    const visualResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: visualPrompt,
    });

    const visualData = visualResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const visualJson = extractJsonFromText(visualData);
    
    if (visualJson) {
      return NextResponse.json({
        bookId,
        feature: "visual_reading_support",
        data: visualJson,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn("Failed to parse visual reading support JSON, using fallback");
      return NextResponse.json({
        bookId,
        feature: "visual_reading_support",
        data: {
          textFormatting: {
            fontSize: "18px",
            lineHeight: "1.6",
            letterSpacing: "0.1em",
            fontFamily: "Arial, sans-serif"
          },
          colorCoding: {
            nouns: "#FF6B6B",
            verbs: "#4ECDC4",
            adjectives: "#9B59B6",
            important: "#FFA07A"
          },
          spacing: {
            paragraphSpacing: "1.5em",
            wordSpacing: "0.2em",
            sentenceSpacing: "1em"
          },
          visualCues: [
            "Use bold for important words",
            "Italicize for emphasis",
            "Underline for new vocabulary"
          ],
          accessibility: {
            highContrast: true,
            largeText: true,
            clearSpacing: true
          }
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
