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

    const comprehensionPrompt = `Create comprehension aids for this children's story text.
    
    Text: "${pageText}"
    Reading level: ${readingLevel}
    Child age: ${childAge}
    
    Provide aids to help with understanding:
    - Visual organizers
    - Question prompts
    - Summary guides
    - Connection makers
    
    IMPORTANT: Return ONLY valid JSON in this exact format:
    {
      "visualOrganizers": [
        {
          "type": "story map",
          "description": "Map out the main events",
          "elements": ["beginning", "middle", "end"]
        }
      ],
      "questionPrompts": [
        {
          "type": "before reading",
          "questions": ["What do you think this story is about?"]
        },
        {
          "type": "during reading",
          "questions": ["What is happening now?"]
        },
        {
          "type": "after reading",
          "questions": ["What was your favorite part?"]
        }
      ],
      "summaryGuide": {
        "mainCharacter": "Who is the main character?",
        "setting": "Where does the story take place?",
        "problem": "What problem does the character face?",
        "solution": "How is the problem solved?",
        "lesson": "What did we learn from this story?"
      },
      "connectionMakers": [
        "Have you ever been on an adventure like this?",
        "Does this remind you of any other stories?",
        "What would you do in this situation?"
      ]
    }`;

    const comprehensionResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: comprehensionPrompt,
    });

    const comprehensionData = comprehensionResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const comprehensionJson = extractJsonFromText(comprehensionData);
    
    if (comprehensionJson) {
      return NextResponse.json({
        bookId,
        feature: "comprehension_aids",
        data: comprehensionJson,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn("Failed to parse comprehension aids JSON, using fallback");
      return NextResponse.json({
        bookId,
        feature: "comprehension_aids",
        data: {
          visualOrganizers: [
            {
              type: "story map",
              description: "Map out the main events",
              elements: ["beginning", "middle", "end"]
            }
          ],
          questionPrompts: [
            {
              type: "before reading",
              questions: ["What do you think this story is about?"]
            },
            {
              type: "during reading",
              questions: ["What is happening now?"]
            },
            {
              type: "after reading",
              questions: ["What was your favorite part?"]
            }
          ],
          summaryGuide: {
            mainCharacter: "Who is the main character?",
            setting: "Where does the story take place?",
            problem: "What problem does the character face?",
            solution: "How is the problem solved?",
            lesson: "What did we learn from this story?"
          },
          connectionMakers: [
            "Have you ever been on an adventure like this?",
            "Does this remind you of any other stories?",
            "What would you do in this situation?"
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
