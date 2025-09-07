import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Book = {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  dedication: string;
  readingLevel: string;
  narratorPersona: string;
  child: { name: string; age: number; interests: string[] };
  pages: Array<{ text: string; activity?: string; prompt?: string; imageUrl?: string }>;
  glossary: Record<string, string>;
  funFacts: string[];
  created_at?: string;
  updated_at?: string;
}
