import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { uploadImageToStorage } from "@/lib/supabase";

const BodySchema = z.object({
  prompt: z.string().min(5),
  characterDescription: z.string().optional(),
  previousImageUrl: z.string().optional(),
  style: z.enum(["realistic", "cartoon", "watercolor", "sketch"]).default("realistic"),
  consistencyMode: z.boolean().default(false),
  editMode: z.boolean().default(false),
  fusionMode: z.boolean().default(false),
  batchGenerate: z.boolean().default(false),
  pageCount: z.number().min(1).max(5).default(1),
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
    
    const { 
      prompt, 
      characterDescription, 
      previousImageUrl, 
      style, 
      consistencyMode, 
      editMode, 
      fusionMode, 
      batchGenerate, 
      pageCount 
    } = parsed.data;

    const ai = new GoogleGenAI({ apiKey });

    // Enhanced prompt for advanced features
    let enhancedPrompt = `Create a high-quality children's book illustration with advanced features. `;
    
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
    
    // Character consistency for multi-page stories
    if (consistencyMode && characterDescription) {
      enhancedPrompt += `Character consistency: Maintain the same character appearance as described: ${characterDescription}. `;
    }
    
    // Image editing and fusion capabilities
    if (editMode && previousImageUrl) {
      enhancedPrompt += `This is an edit/continuation of a previous scene. Maintain visual continuity and character consistency. `;
    }
    
    if (fusionMode) {
      enhancedPrompt += `Use image fusion techniques to blend multiple elements seamlessly. `;
    }
    
    enhancedPrompt += `Lighting: soft, natural lighting. Colors: vibrant but not overwhelming. Composition: clean, uncluttered, focus on the main subject. ${prompt}`;

    // Handle batch generation for multiple pages
    if (batchGenerate && pageCount > 1) {
      const imageUrls = [];
      
      for (let i = 0; i < pageCount; i++) {
        const pagePrompt = `${enhancedPrompt} This is page ${i + 1} of ${pageCount}. `;
        
        const response = await ai.models.generateContent({
          model: MODEL_IMAGE,
          contents: pagePrompt,
        });

        const imageUrl = await processImageResponse(response, i);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }
      
      return NextResponse.json({ 
        imageUrls, 
        batchGenerated: true,
        count: imageUrls.length 
      });
    } else {
      // Single image generation
      const response = await ai.models.generateContent({
        model: MODEL_IMAGE,
        contents: enhancedPrompt,
      });

      const imageUrl = await processImageResponse(response);
      if (!imageUrl) {
        return NextResponse.json({ error: "No image returned from model" }, { status: 502 });
      }

      return NextResponse.json({ 
        imageUrl,
        batchGenerated: false,
        features: {
          consistencyMode,
          editMode,
          fusionMode,
          style
        }
      });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

interface ImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
        };
      }>;
    };
  }>;
}

async function processImageResponse(response: unknown, pageIndex?: number): Promise<string | null> {
  try {
    const imageResponse = response as ImageResponse;
    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          
          if (imageData) {
            const buffer = Buffer.from(imageData, "base64");
            
            // Generate unique filename
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const pageSuffix = pageIndex !== undefined ? `_page${pageIndex + 1}` : '';
            const filename = `advanced_illustration_${timestamp}_${randomId}${pageSuffix}.png`;
            
            // Upload to Supabase storage
            const imageUrl = await uploadImageToStorage(buffer, filename);
            return imageUrl;
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error processing image response:", error);
    return null;
  }
}
