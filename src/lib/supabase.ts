import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create a service role client for admin operations
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Helper function to upload image to Supabase storage
export async function uploadImageToStorage(
  imageBuffer: Buffer, 
  filename: string, 
  bucketName: string = 'story-images'
): Promise<string | null> {
  try {
    // First, check if bucket exists and create it if needed
    if (supabaseAdmin) {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
      if (listError) {
        console.error('Error listing buckets:', listError)
      } else {
        const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
        if (!bucketExists) {
          console.log(`Creating bucket ${bucketName}...`)
          const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB
          })
          if (createError) {
            console.error('Error creating bucket:', createError)
          } else {
            console.log(`Bucket ${bucketName} created successfully`)
          }
        }
      }
    }

    // Try to upload to the bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (error) {
      // If bucket doesn't exist or other error, fallback to local storage
      console.warn(`Failed to upload to Supabase storage: ${error.message}`)
      console.warn('Falling back to local file storage...')
      
      // Fallback to local storage
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      
      const imagePath = join(process.cwd(), "public", "images", filename);
      await mkdir(join(process.cwd(), "public", "images"), { recursive: true });
      await writeFile(imagePath, imageBuffer);
      return `/images/${filename}`;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadImageToStorage:', error)
    return null
  }
}

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
