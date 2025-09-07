import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const BodySchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  city: z.string(),
  dedication: z.string().optional(),
  readingLevel: z.string(),
  narratorPersona: z.string(),
  child: z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string())
  }),
  pages: z.array(z.object({
    text: z.string(),
    activity: z.string().optional(),
    prompt: z.string().optional(),
    imageUrl: z.string().optional()
  })),
  glossary: z.record(z.string(), z.string()).optional(),
  funFacts: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const book = parsed.data;
    
    const { data, error } = await supabase
      .from('books')
      .insert({
        title: book.title,
        subtitle: book.subtitle,
        city: book.city,
        dedication: book.dedication,
        reading_level: book.readingLevel,
        narrator_persona: book.narratorPersona,
        child_name: book.child.name,
        child_age: book.child.age,
        child_interests: book.child.interests,
        pages: book.pages,
        glossary: book.glossary || {},
        fun_facts: book.funFacts || []
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ book: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
