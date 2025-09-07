-- Create books table
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  city TEXT NOT NULL,
  dedication TEXT,
  reading_level TEXT NOT NULL,
  narrator_persona TEXT,
  child_name TEXT NOT NULL,
  child_age INTEGER NOT NULL,
  child_interests TEXT[],
  pages JSONB NOT NULL,
  glossary JSONB,
  fun_facts TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_books_created_at ON books(created_at DESC);
CREATE INDEX idx_books_city ON books(city);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON books
  FOR SELECT USING (true);

-- Create policy to allow public insert access
CREATE POLICY "Allow public insert access" ON books
  FOR INSERT WITH CHECK (true);

-- Create policy to allow public update access
CREATE POLICY "Allow public update access" ON books
  FOR UPDATE USING (true);

-- Create policy to allow public delete access
CREATE POLICY "Allow public delete access" ON books
  FOR DELETE USING (true);
