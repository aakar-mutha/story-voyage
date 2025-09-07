import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const imagePath = join(process.cwd(), 'public', 'images', ...resolvedParams.path);
    
    // Security check - ensure the path is within the images directory
    const resolvedPath = join(process.cwd(), 'public', 'images');
    if (!imagePath.startsWith(resolvedPath)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const imageBuffer = await readFile(imagePath);
    
    // Determine content type based on file extension
    const extension = resolvedParams.path[resolvedParams.path.length - 1].split('.').pop()?.toLowerCase();
    let contentType = 'image/png';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
    }

    return new NextResponse(imageBuffer as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Image not found', { status: 404 });
  }
}
