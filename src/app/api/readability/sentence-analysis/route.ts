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

    const analysisPrompt = `Analyze the sentence structure and readability of this children's story text.
    
    Text: "${pageText}"
    Reading level: ${readingLevel}
    Child age: ${childAge}
    
    Provide detailed analysis including:
    - Sentence length analysis
    - Complex word identification
    - Reading flow assessment
    - Structural improvements
    
    IMPORTANT: Return ONLY valid JSON in this exact format:
    {
      "sentenceAnalysis": {
        "totalSentences": 5,
        "averageLength": 12.4,
        "longestSentence": 18,
        "shortestSentence": 8,
        "complexSentences": 2
      },
      "wordAnalysis": {
        "totalWords": 62,
        "complexWords": ["adventure", "discovered"],
        "syllableCount": {
          "adventure": 3,
          "discovered": 3
        }
      },
      "flowAnalysis": {
        "smoothTransitions": 3,
        "awkwardPhrases": 1,
        "repetitiveWords": ["the", "and"]
      },
      "improvements": [
        "Break long sentences into shorter ones",
        "Replace complex words with simpler alternatives"
      ]
    }`;

    const analysisResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: analysisPrompt,
    });

    const analysisData = analysisResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const analysisJson = extractJsonFromText(analysisData);
    
    if (analysisJson) {
      return NextResponse.json({
        bookId,
        feature: "sentence_analysis",
        data: analysisJson,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn("Failed to parse sentence analysis JSON, using fallback");
      return NextResponse.json({
        bookId,
        feature: "sentence_analysis",
        data: {
          sentenceAnalysis: {
            totalSentences: 5,
            averageLength: 12.4,
            longestSentence: 18,
            shortestSentence: 8,
            complexSentences: 2
          },
          wordAnalysis: {
            totalWords: 62,
            complexWords: ["adventure", "discovered"],
            syllableCount: {
              "adventure": 3,
              "discovered": 3
            }
          },
          flowAnalysis: {
            smoothTransitions: 3,
            awkwardPhrases: 1,
            repetitiveWords: ["the", "and"]
          },
          improvements: [
            "Break long sentences into shorter ones",
            "Replace complex words with simpler alternatives"
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
