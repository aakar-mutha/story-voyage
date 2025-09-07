import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { uploadImageToStorage } from "@/lib/supabase";

const BodySchema = z.object({
  bookId: z.string(),
  pages: z.array(z.object({
    text: z.string(),
    prompt: z.string(),
    pageIndex: z.number()
  })),
  characterDescription: z.string().optional(),
  style: z.enum(["realistic", "cartoon", "watercolor", "sketch"]).default("realistic"),
  consistencyMode: z.boolean().default(true),
  fusionMode: z.boolean().default(false),
  batchSize: z.number().min(1).max(5).default(3)
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
    
    const { bookId, pages, characterDescription, style, consistencyMode, fusionMode, batchSize } = parsed.data;
    const ai = new GoogleGenAI({ apiKey });

    console.log(`Starting batch illustration for book ${bookId} with ${pages.length} pages`);

    // Process pages in batches to avoid overwhelming the API
    const results = [];
    const totalBatches = Math.ceil(pages.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, pages.length);
      const batchPages = pages.slice(startIndex, endIndex);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (pages ${startIndex + 1}-${endIndex})`);

      // Process batch pages in parallel
      const batchPromises = batchPages.map(async (page, pageIndex) => {
        const globalPageIndex = startIndex + pageIndex;
        return await generatePageIllustration(
          ai, 
          page, 
          globalPageIndex, 
          characterDescription, 
          style, 
          consistencyMode, 
          fusionMode,
          pages // Pass all pages for context
        );
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add a small delay between batches to be respectful to the API
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Filter out failed generations
    const successfulResults = results.filter(result => result.success);
    const failedResults = results.filter(result => !result.success);

    console.log(`Batch illustration completed: ${successfulResults.length} successful, ${failedResults.length} failed`);

    return NextResponse.json({
      success: true,
      bookId,
      results: successfulResults,
      failedResults,
      summary: {
        totalPages: pages.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        successRate: `${Math.round((successfulResults.length / pages.length) * 100)}%`
      },
      batchProcessing: {
        totalBatches,
        batchSize,
        processingTime: Date.now()
      }
    });

  } catch (err: unknown) {
    console.error("Batch illustration error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

async function generatePageIllustration(
  ai: GoogleGenAI,
  page: { text: string; prompt: string; pageIndex: number },
  pageIndex: number,
  characterDescription: string | undefined,
  style: string,
  consistencyMode: boolean,
  fusionMode: boolean,
  _allPages: { text: string; prompt: string; pageIndex: number }[]
): Promise<{ success: boolean; pageIndex: number; imageUrl?: string; error?: string; prompt?: string; text?: string; features?: Record<string, string> }> {
  try {
    // Build enhanced prompt for this specific page
    let enhancedPrompt = `Create a high-quality children's book illustration for page ${pageIndex + 1}. `;
    
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
    
    // Character consistency - always enforce when character description is available
    if (characterDescription) {
      enhancedPrompt += `Character consistency: Maintain the same character appearance as described: ${characterDescription}. `;
    } else if (consistencyMode) {
      enhancedPrompt += `Character consistency: Maintain consistent character appearance throughout the story. `;
    }
    
    // Scene continuity - reference previous pages
    if (pageIndex > 0) {
      enhancedPrompt += `This is a continuation of the story. Maintain visual continuity with previous scenes. `;
    }
    
    // Fusion mode for complex scenes
    if (fusionMode) {
      enhancedPrompt += `Use advanced image fusion techniques to blend multiple story elements seamlessly. `;
    }
    
    enhancedPrompt += `Lighting: soft, natural lighting. Colors: vibrant but not overwhelming. Composition: clean, uncluttered, focus on the main subject. ${page.prompt}`;

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: enhancedPrompt,
    });

    const imageUrl = await processImageResponse(response, pageIndex);
    
    if (!imageUrl) {
      return {
        success: false,
        pageIndex,
        error: "No image generated"
      };
    }

    return {
      success: true,
      pageIndex,
      imageUrl,
      prompt: page.prompt,
      text: page.text,
      features: {
        style,
        consistencyMode: consistencyMode ? "Enabled" : "Disabled",
        fusionMode: fusionMode ? "Enabled" : "Disabled",
        characterDescription: characterDescription ? "Applied" : "None"
      }
    };

  } catch (error) {
    console.error(`Error generating illustration for page ${pageIndex + 1}:`, error);
    return {
      success: false,
      pageIndex,
      error: error instanceof Error ? error.message : "Unknown error"
    };
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

async function processImageResponse(response: unknown, pageIndex: number): Promise<string | null> {
  try {
    const imageResponse = response as ImageResponse;
    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          
          if (imageData) {
            const buffer = Buffer.from(imageData, "base64");
            
            // Generate unique filename with page index
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const filename = `batch_illustration_${timestamp}_page${pageIndex + 1}_${randomId}.png`;
            
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
