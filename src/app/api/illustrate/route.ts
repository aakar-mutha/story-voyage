import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const BodySchema = z.object({
  prompt: z.string().min(5),
  characterDescription: z.string().optional(),
  previousImageUrl: z.string().optional(),
  style: z.enum(["realistic", "cartoon", "watercolor", "sketch"]).default("realistic"),
  consistencyMode: z.boolean().default(false),
  editMode: z.boolean().default(false),
});

const MODEL_IMAGE = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";

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
    const { prompt, characterDescription, previousImageUrl, style, consistencyMode, editMode } = parsed.data;

    const ai = new GoogleGenAI({ apiKey });

    // Build enhanced prompt based on parameters
    let enhancedPrompt = `Create a high-quality children's book illustration. `;
    
    // Style-specific instructions
    switch (style) {
      case "realistic":
        enhancedPrompt += `Style: photorealistic, warm and inviting, suitable for ages 3-12. `;
        break;
      case "cartoon":
        enhancedPrompt += `Style: colorful cartoon illustration, friendly and engaging, suitable for ages 3-12. `;
        break;
      case "watercolor":
        enhancedPrompt += `Style: soft watercolor painting, artistic and dreamy, suitable for ages 3-12. `;
        break;
      case "sketch":
        enhancedPrompt += `Style: detailed pencil sketch with light coloring, educational and clear, suitable for ages 3-12. `;
        break;
    }
    
    // Character consistency
    if (consistencyMode && characterDescription) {
      enhancedPrompt += `Character consistency: Maintain the same character appearance as described: ${characterDescription}. `;
    }
    
    // Image editing mode
    if (editMode && previousImageUrl) {
      enhancedPrompt += `This is an edit/continuation of a previous scene. Maintain visual continuity and character consistency. `;
    }
    
    enhancedPrompt += `Lighting: soft, natural lighting. Colors: vibrant but not overwhelming. Composition: clean, uncluttered, focus on the main subject. ${prompt}`;

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: enhancedPrompt,
    });

    // Look for image data in the response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          
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
          } else {
            throw new Error("No image data received");
          }
          
          // Return public URL
          const imageUrl = `/images/${filename}`;
          return NextResponse.json({ imageUrl });
        }
      }
    }

    return NextResponse.json({ error: "No image returned from model" }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}


