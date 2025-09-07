import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const BodySchema = z.object({
  city: z.string().min(2),
  childName: z.string().min(1),
  childAge: z.number().int().min(3).max(12),
  interests: z.array(z.string()).default([]),
  narratorPersona: z.string().default("A friendly world traveler who loves discovering hidden wonders"),
  readingLevel: z.enum(["early", "middle", "advanced"]).default("middle"),
  pages: z.number().int().min(3).max(5).default(3),
});

const MODEL_TEXT = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const MODEL_IMAGE = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";

type Book = {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  dedication: string;
  readingLevel: string;
  narratorPersona: string;
  child: { name: string; age: number; interests: string[] };
  pages: Array<{
    text: string;
    activity?: string;
    prompt?: string;
    imageUrl?: string;
  }>;
  glossary: Record<string, string>;
  funFacts: string[];
};

function extractJsonCandidate(text: string): Book | null {
  try {
    // Try plain JSON first
    return JSON.parse(text);
  } catch {}
  // Try fenced JSON in code block
  const match = text.match(/```json[\s\S]*?```/i) || text.match(/```[\s\S]*?```/);
  if (match) {
    const inner = match[0].replace(/```json|```/g, "").trim();
    try { return JSON.parse(inner); } catch {}
  }
  // Try first JSON object substring
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybe = text.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(maybe); } catch {}
  }
  throw new Error("Unable to parse JSON from model output");
}

async function generateIllustration(ai: GoogleGenAI, prompt: string): Promise<string | null> {
  try {
    // Enhance prompt for realistic children's book illustrations
    const enhancedPrompt = `Create a realistic, high-quality children's book illustration. Style: photorealistic, warm and inviting, suitable for ages 3-12. Lighting: soft, natural lighting. Colors: vibrant but not overwhelming. Composition: clean, uncluttered, focus on the main subject. ${prompt}`;

    console.log("Calling Gemini API with model:", MODEL_IMAGE);
    console.log("Enhanced prompt:", enhancedPrompt);
    
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: enhancedPrompt,
    });
    
    console.log("API Response received:", !!response);

    // Look for image data in the response
    console.log("Response structure:", JSON.stringify(response, null, 2));
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        console.log("Part structure:", JSON.stringify(part, null, 2));
        
        // Check for inlineData (older format)
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          console.log("Found inlineData, length:", imageData?.length);
          
          // Generate unique filename
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 8);
          const filename = `illustration_${timestamp}_${randomId}.png`;
          const imagePath = join(process.cwd(), "public", "images", filename);
          
          // Ensure images directory exists
          await mkdir(join(process.cwd(), "public", "images"), { recursive: true });
          
          // Save image to filesystem
          if (imageData) {
            const buffer = Buffer.from(imageData, "base64");
            await writeFile(imagePath, buffer);
            console.log("Image saved to:", imagePath);
            return `/images/${filename}`;
          }
        }
        
        // Check for newer format with direct image data
        if (part.text && part.text.includes('data:image')) {
          console.log("Found text with image data");
          // Extract base64 data from data URL
          const base64Data = part.text.split(',')[1];
          if (base64Data) {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const filename = `illustration_${timestamp}_${randomId}.png`;
            const imagePath = join(process.cwd(), "public", "images", filename);
            
            await mkdir(join(process.cwd(), "public", "images"), { recursive: true });
            
            const buffer = Buffer.from(base64Data, "base64");
            await writeFile(imagePath, buffer);
            console.log("Image saved to:", imagePath);
            return `/images/${filename}`;
          }
        }
      }
    }
    console.log("No image data found in response");
    return null;
  } catch (error) {
    console.error("Error generating illustration:", error);
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
    const parse = BodySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid body", details: parse.error.flatten() }, { status: 400 });
    }
    const { city, childName, childAge, interests, narratorPersona, readingLevel, pages } = parse.data;

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a master children's travel storyteller writing a wholesome, vivid, culturally respectful book that inspires curiosity and kindness.

Return ONLY a compact JSON (no narration outside JSON). Use this TypeScript type shape:
type Book = {
  id: string; // short id
  title: string;
  subtitle: string;
  city: string;
  dedication: string;
  readingLevel: string; // "early" | "middle" | "advanced"
  narratorPersona: string;
  child: { name: string; age: number; interests: string[] };
  pages: Array<{
    text: string; // 60-120 words per page; age-appropriate vocabulary
    activity?: string; // optional interactive prompt for the child
    prompt?: string; // imaginative illustration prompt
  }>;
  glossary: Record<string, string>; // travel/culture words → kid-friendly definitions
  funFacts: string[]; // delightful facts about the city
};

Constraints:
- City: ${city}
- Child: ${childName}, age ${childAge}, interests: ${interests.join(", ") || "none specified"}
- Narrator: ${narratorPersona}
- Reading level: ${readingLevel}
- Pages: ${pages}

Style:
- Positive, inclusive, culturally accurate; celebrate local foods, landmarks, language words.
- Encourage empathy and curiosity. Avoid stereotypes. Keep sentences clear and rhythmic.
- Include gentle humor and sensory details (sounds, smells, textures).

Return strictly valid JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const data = extractJsonCandidate(text) as Book;

    // Minimal validation
    if (!data || !data.title || !Array.isArray(data.pages)) {
      throw new Error("Model response missing required fields");
    }

    // Generate illustrations for all pages
    console.log("Generating illustrations for all pages...");
    console.log("Pages to illustrate:", data.pages.map(p => ({ hasPrompt: !!p.prompt, prompt: p.prompt })));
    
    const pagesWithImages = await Promise.all(
      data.pages.map(async (page, index) => {
        if (page.prompt) {
          console.log(`Generating illustration for page ${index + 1}: ${page.prompt}`);
          let imageUrl = await generateIllustration(ai, page.prompt);
          
          // If direct generation fails, try using the individual illustrate API as fallback
          if (!imageUrl) {
            console.log(`Direct generation failed for page ${index + 1}, trying fallback...`);
            try {
              const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/illustrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: page.prompt })
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                imageUrl = fallbackData.imageUrl;
                console.log(`Fallback successful for page ${index + 1}:`, imageUrl);
              }
            } catch (fallbackError) {
              console.error(`Fallback failed for page ${index + 1}:`, fallbackError);
            }
          }
          
          console.log(`Page ${index + 1} illustration result:`, imageUrl);
          return { ...page, imageUrl };
        }
        console.log(`Page ${index + 1} has no prompt, skipping illustration`);
        return page;
      })
    );

    // Update the book data with illustrated pages
    const illustratedBook = { ...data, pages: pagesWithImages };
    console.log(`Generated ${pagesWithImages.filter(p => p.imageUrl).length} illustrations out of ${pagesWithImages.length} pages`);

    // Try to save to Supabase, but don't fail if it doesn't work
    try {
      const { data: savedBook, error } = await supabase
        .from('books')
        .insert({
          title: illustratedBook.title,
          subtitle: illustratedBook.subtitle,
          city: illustratedBook.city,
          dedication: illustratedBook.dedication,
          reading_level: illustratedBook.readingLevel,
          narrator_persona: illustratedBook.narratorPersona,
          child_name: illustratedBook.child.name,
          child_age: illustratedBook.child.age,
          child_interests: illustratedBook.child.interests,
          pages: illustratedBook.pages,
          glossary: illustratedBook.glossary || {},
          fun_facts: illustratedBook.funFacts || []
        })
        .select()
        .single();
      
      if (error) {
        console.warn("Supabase save failed, returning book without saving:", error);
        // Add a temporary ID for the book
        const bookWithId = { ...illustratedBook, id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
        return NextResponse.json({ book: bookWithId });
      }

      // Convert database structure back to expected format
      const formattedBook = {
        id: savedBook.id,
        title: savedBook.title,
        subtitle: savedBook.subtitle,
        city: savedBook.city,
        dedication: savedBook.dedication,
        readingLevel: savedBook.reading_level,
        narratorPersona: savedBook.narrator_persona,
        child: {
          name: savedBook.child_name,
          age: savedBook.child_age,
          interests: savedBook.child_interests || []
        },
        pages: savedBook.pages || [],
        glossary: savedBook.glossary || {},
        funFacts: savedBook.fun_facts || []
      };
      
      return NextResponse.json({ book: formattedBook });
    } catch (supabaseError) {
      console.warn("Supabase connection failed, returning book without saving:", supabaseError);
      // Add a temporary ID for the book
      const bookWithId = { ...illustratedBook, id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
      return NextResponse.json({ book: bookWithId });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}


