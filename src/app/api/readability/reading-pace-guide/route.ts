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

    const pacePrompt = `Create a reading pace guide for this children's story text.
    
    Text: "${pageText}"
    Reading level: ${readingLevel}
    Child age: ${childAge}
    
    Provide guidance on:
    - Reading speed recommendations
    - Pause points
    - Emphasis areas
    - Breathing breaks
    
    IMPORTANT: Return ONLY valid JSON in this exact format:
    {
      "paceGuide": {
        "recommendedSpeed": "slow and steady",
        "wordsPerMinute": 120,
        "totalReadingTime": "2-3 minutes",
        "pausePoints": [
          {
            "location": "after first sentence",
            "reason": "Let the setting sink in",
            "duration": "2-3 seconds"
          }
        ],
        "emphasisAreas": [
          {
            "text": "key words or phrases",
            "reason": "Important for understanding",
            "technique": "speak slightly louder"
          }
        ]
      },
      "breathingBreaks": [
        "Take a deep breath before starting",
        "Pause at commas for natural rhythm"
      ],
      "readingTips": [
        "Read with expression",
        "Point to words as you read",
        "Ask questions about what you read"
      ]
    }`;

    const paceResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: pacePrompt,
    });

    const paceData = paceResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const paceJson = extractJsonFromText(paceData);
    
    if (paceJson) {
      return NextResponse.json({
        bookId,
        feature: "reading_pace_guide",
        data: paceJson,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn("Failed to parse reading pace guide JSON, using fallback");
      return NextResponse.json({
        bookId,
        feature: "reading_pace_guide",
        data: {
          paceGuide: {
            recommendedSpeed: "slow and steady",
            wordsPerMinute: 120,
            totalReadingTime: "2-3 minutes",
            pausePoints: [
              {
                location: "after first sentence",
                reason: "Let the setting sink in",
                duration: "2-3 seconds"
              }
            ],
            emphasisAreas: [
              {
                text: "key words or phrases",
                reason: "Important for understanding",
                technique: "speak slightly louder"
              }
            ]
          },
          breathingBreaks: [
            "Take a deep breath before starting",
            "Pause at commas for natural rhythm"
          ],
          readingTips: [
            "Read with expression",
            "Point to words as you read",
            "Ask questions about what you read"
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
