import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  action: z.enum(["generate_share_image", "create_summary", "export_audio", "generate_qr"]),
  bookData: z.object({
    title: z.string(),
    subtitle: z.string(),
    city: z.string(),
    childName: z.string(),
    pages: z.array(z.object({
      text: z.string(),
      imageUrl: z.string().optional()
    }))
  }).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { bookId, action, bookData } = parsed.data;

    switch (action) {
      case "generate_share_image":
        return await generateShareImage(bookId, bookData);
      case "create_summary":
        return await createBookSummary(bookId, bookData);
      case "export_audio":
        return await generateAudioExport(bookId, bookData);
      case "generate_qr":
        return await generateQRCode(bookId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}

async function generateShareImage(bookId: string, bookData: any) {
  // Generate a beautiful shareable image for social media
  const shareData = {
    bookId,
    title: bookData?.title || "Amazing Story",
    subtitle: bookData?.subtitle || "Created with StoryVoyage",
    city: bookData?.city || "Unknown City",
    childName: bookData?.childName || "Your Child",
    pageCount: bookData?.pages?.length || 0,
    shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/read?id=${bookId}`,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    shareData,
    shareImageUrl: `/api/generate-share-image?bookId=${bookId}`,
    socialText: `Check out this amazing story "${shareData.title}" created for ${shareData.childName} about ${shareData.city}! Created with StoryVoyage ✨`
  });
}

async function createBookSummary(bookId: string, bookData: any) {
  if (!bookData) {
    return NextResponse.json({ error: "Book data required for summary" }, { status: 400 });
  }

  const summary = {
    bookId,
    title: bookData.title,
    subtitle: bookData.subtitle,
    city: bookData.city,
    childName: bookData.childName,
    pageCount: bookData.pages.length,
    readingTime: Math.ceil(bookData.pages.reduce((acc: number, page: any) => acc + page.text.split(' ').length, 0) / 200), // ~200 words per minute
    keyThemes: extractThemes(bookData.pages),
    educationalValue: {
      vocabularyWords: extractVocabulary(bookData.pages),
      culturalElements: [bookData.city],
      readingLevel: "Adaptive"
    },
    accessibility: {
      hasImages: bookData.pages.some((page: any) => page.imageUrl),
      textLength: bookData.pages.reduce((acc: number, page: any) => acc + page.text.length, 0),
      estimatedAgeRange: "3-12 years"
    }
  };

  return NextResponse.json({
    success: true,
    summary,
    exportFormats: ["PDF", "EPUB", "AUDIO", "PRINT"]
  });
}

async function generateAudioExport(bookId: string, bookData: any) {
  if (!bookData) {
    return NextResponse.json({ error: "Book data required for audio export" }, { status: 400 });
  }

  // This would integrate with a text-to-speech service
  const audioData = {
    bookId,
    title: bookData.title,
    audioUrl: `/api/generate-audio?bookId=${bookId}`,
    duration: bookData.pages.length * 30, // Estimate 30 seconds per page
    format: "MP3",
    quality: "High",
    voice: "Child-friendly narrator",
    features: {
      backgroundMusic: true,
      soundEffects: true,
      pageTurns: true,
      highlighting: true
    }
  };

  return NextResponse.json({
    success: true,
    audioData,
    downloadUrl: audioData.audioUrl,
    streamingUrl: audioData.audioUrl
  });
}

async function generateQRCode(bookId: string) {
  const qrData = {
    bookId,
    qrUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/read?id=${bookId}`,
    qrImageUrl: `/api/generate-qr?bookId=${bookId}`,
    shortUrl: `storyvoyage.app/${bookId}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };

  return NextResponse.json({
    success: true,
    qrData,
    shareOptions: {
      directLink: qrData.qrUrl,
      shortLink: qrData.shortUrl,
      qrCode: qrData.qrImageUrl
    }
  });
}

function extractThemes(pages: any[]): string[] {
  // Simple theme extraction - in a real app, this would use AI
  const themes = new Set<string>();
  const text = pages.map(p => p.text).join(' ').toLowerCase();
  
  if (text.includes('adventure') || text.includes('explore')) themes.add('Adventure');
  if (text.includes('friend') || text.includes('together')) themes.add('Friendship');
  if (text.includes('learn') || text.includes('discover')) themes.add('Learning');
  if (text.includes('family') || text.includes('home')) themes.add('Family');
  if (text.includes('travel') || text.includes('visit')) themes.add('Travel');
  
  return Array.from(themes);
}

function extractVocabulary(pages: any[]): string[] {
  // Simple vocabulary extraction - in a real app, this would use AI
  const words = new Set<string>();
  const text = pages.map(p => p.text).join(' ');
  const wordList = text.split(/\s+/).filter(word => 
    word.length > 6 && 
    /^[a-zA-Z]+$/.test(word) && 
    !['the', 'and', 'with', 'that', 'this', 'they', 'have', 'from', 'were', 'been', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'these', 'think', 'through', 'where', 'would', 'years'].includes(word.toLowerCase())
  );
  
  wordList.forEach(word => words.add(word.toLowerCase()));
  return Array.from(words).slice(0, 10); // Top 10 vocabulary words
}
