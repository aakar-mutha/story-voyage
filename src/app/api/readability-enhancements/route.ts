import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12),
  features: z.array(z.enum([
    "text_simplification",
    "sentence_analysis",
    "vocabulary_highlighting",
    "reading_pace_guide",
    "comprehension_aids",
    "visual_reading_support"
  ])).default(["text_simplification", "sentence_analysis"])
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';

async function callReadabilityFeature(feature: string, bookId: string, pageText: string, readingLevel: string, childAge: number) {
  const featureMap: Record<string, string> = {
    "text_simplification": "text-simplification",
    "sentence_analysis": "sentence-analysis", 
    "vocabulary_highlighting": "vocabulary-highlighting",
    "reading_pace_guide": "reading-pace-guide",
    "comprehension_aids": "comprehension-aids",
    "visual_reading_support": "visual-reading-support"
  };

  const endpoint = featureMap[feature];
  if (!endpoint) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  const url = `${BASE_URL}/api/readability/${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookId,
        pageText,
        readingLevel,
        childAge
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to call ${feature}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling ${feature}:`, error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { bookId, pageText, readingLevel, childAge, features } = parsed.data;

    // Call all features in parallel for much faster response
    const featurePromises = features.map(feature => 
      callReadabilityFeature(feature, bookId, pageText, readingLevel, childAge)
    );

    const results = await Promise.allSettled(featurePromises);
    
    const readabilityContent: Record<string, unknown> = {};
    const successfulFeatures: string[] = [];
    const failedFeatures: string[] = [];

    results.forEach((result, index) => {
      const feature = features[index];
      if (result.status === 'fulfilled') {
        readabilityContent[feature] = result.value.data;
        successfulFeatures.push(feature);
      } else {
        console.error(`Feature ${feature} failed:`, result.reason);
        failedFeatures.push(feature);
      }
    });

    return NextResponse.json({
      bookId,
      readabilityContent,
      featuresGenerated: successfulFeatures,
      failedFeatures,
      timestamp: new Date().toISOString(),
      readabilityScore: calculateReadabilityScore(readabilityContent, childAge)
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

function calculateReadabilityScore(content: Record<string, unknown>, childAge: number): number {
  let score = 0;
  
  // Base score
  score += 50;
  
  // Age-appropriate bonus
  if (childAge >= 3 && childAge <= 5) {
    score += content.textSimplification ? 20 : 0;
    score += content.visualReadingSupport ? 15 : 0;
  } else if (childAge >= 6 && childAge <= 8) {
    score += content.sentenceAnalysis ? 20 : 0;
    score += content.vocabularyHighlighting ? 15 : 0;
  } else if (childAge >= 9 && childAge <= 12) {
    score += content.comprehensionAids ? 20 : 0;
    score += content.readingPaceGuide ? 15 : 0;
  }
  
  // Feature diversity bonus
  const featureCount = Object.keys(content).length;
  score += featureCount * 5;
  
  return Math.min(score, 100);
}
