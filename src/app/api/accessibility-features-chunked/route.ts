import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  imageUrl: z.string().optional(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12),
  feature: z.enum([
    "alt_text_generation",
    "simplified_text",
    "dyslexia_friendly",
    "audio_description"
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
    
    const { bookId: _bookId, pageText, imageUrl, readingLevel, childAge, feature } = parsed.data; // eslint-disable-line @typescript-eslint/no-unused-vars
    const ai = new GoogleGenAI({ apiKey });

    let result: Record<string, unknown> = {};

    switch (feature) {
      case "alt_text_generation":
        result = await generateAltText(ai, pageText, imageUrl, childAge);
        break;
      case "simplified_text":
        result = await generateSimplifiedText(ai, pageText, readingLevel, childAge);
        break;
      case "dyslexia_friendly":
        result = await generateDyslexiaFriendly(ai, pageText, childAge);
        break;
      case "audio_description":
        result = await generateAudioDescription(ai, pageText, childAge);
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
    console.error("Accessibility features chunked error:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}

async function generateAltText(ai: GoogleGenAI, pageText: string, imageUrl: string | undefined, childAge: number) {
  const prompt = `Create alt text for a children's book illustration.
  
  Story text: "${pageText}"
  Child age: ${childAge}
  ${imageUrl ? `Image URL: ${imageUrl}` : ''}
  
  Generate simple, descriptive alt text that a child can understand.
  
  Return ONLY valid JSON:
  {
    "altText": "A young child exploring a magical garden with colorful flowers",
    "simpleAltText": "A kid in a pretty garden",
    "emotionalContext": "The child looks happy and curious",
    "keyElements": ["child", "garden", "flowers", "sunshine"]
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
    altText: "A child having an adventure in the story",
    simpleAltText: "A kid in the story",
    emotionalContext: "The child looks happy",
    keyElements: ["child", "adventure", "story"]
  };
}

async function generateSimplifiedText(ai: GoogleGenAI, pageText: string, readingLevel: string, childAge: number) {
  const prompt = `Create simplified versions of this text for different reading levels.
  
  Original text: "${pageText}"
  Child age: ${childAge}
  
  Create 3 versions: early reader, middle reader, and advanced reader.
  
  Return ONLY valid JSON:
  {
    "earlyReader": "Simple version with basic words",
    "middleReader": "Medium version with some complex words",
    "advancedReader": "More complex version with rich vocabulary",
    "originalText": "${pageText}",
    "readingLevels": {
      "early": "Ages 3-5",
      "middle": "Ages 6-8", 
      "advanced": "Ages 9-12"
    }
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
    earlyReader: pageText,
    middleReader: pageText,
    advancedReader: pageText,
    originalText: pageText,
    readingLevels: {
      early: "Ages 3-5",
      middle: "Ages 6-8",
      advanced: "Ages 9-12"
    }
  };
}

async function generateDyslexiaFriendly(ai: GoogleGenAI, pageText: string, childAge: number) {
  const prompt = `Create dyslexia-friendly formatting for this text.
  
  Text: "${pageText}"
  Child age: ${childAge}
  
  Provide formatting suggestions and visual aids.
  
  Return ONLY valid JSON:
  {
    "formatting": {
      "font": "OpenDyslexic or Comic Sans",
      "size": "16px or larger",
      "lineHeight": "1.5 or more",
      "letterSpacing": "0.1em"
    },
    "colorCoding": {
      "nouns": "#FF6B6B",
      "verbs": "#4ECDC4",
      "adjectives": "#9B59B6"
    },
    "chunking": ["Break text into", "smaller pieces"],
    "visualAids": ["Use images", "Use colors"],
    "memoryTechniques": ["Create rhymes", "Use repetition"]
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
    formatting: {
      font: "OpenDyslexic or Comic Sans",
      size: "16px or larger",
      lineHeight: "1.5 or more",
      letterSpacing: "0.1em"
    },
    colorCoding: {
      nouns: "#FF6B6B",
      verbs: "#4ECDC4",
      adjectives: "#9B59B6"
    },
    chunking: ["Break text into smaller pieces", "Use short sentences"],
    visualAids: ["Use images to support text", "Use colors to highlight important words"],
    memoryTechniques: ["Create rhymes for difficult words", "Use repetition to reinforce learning"]
  };
}

async function generateAudioDescription(ai: GoogleGenAI, pageText: string, childAge: number) {
  const prompt = `Create audio description for this children's story.
  
  Text: "${pageText}"
  Child age: ${childAge}
  
  Create a simple audio description that brings the story to life.
  
  Return ONLY valid JSON:
  {
    "audioDescription": "A gentle voice describes the story with sound effects",
    "soundEffects": ["birds chirping", "footsteps", "wind blowing"],
    "voiceInstructions": "Use a warm, friendly voice",
    "pacing": "Speak slowly and clearly"
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const data = extractJsonFromText(text);
  
  return data || {
    audioDescription: "A gentle voice describes the story with sound effects",
    soundEffects: ["birds chirping", "footsteps", "wind blowing"],
    voiceInstructions: "Use a warm, friendly voice",
    pacing: "Speak slowly and clearly"
  };
}
