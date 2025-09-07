import { NextResponse } from "next/server";
import { readdir, unlink } from "fs/promises";
import { join } from "path";

export async function POST() {
  try {
    const imagesDir = join(process.cwd(), "public", "images");
    
    // Get all image files
    const files = await readdir(imagesDir);
    const imageFiles = files.filter(file => file.startsWith("illustration_") && file.endsWith(".png"));
    
    // Keep only the 50 most recent images (based on timestamp in filename)
    const sortedFiles = imageFiles
      .map(file => ({
        name: file,
        timestamp: parseInt(file.split("_")[1]) || 0
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    
    const filesToKeep = sortedFiles.slice(0, 50);
    const filesToDelete = sortedFiles.slice(50);
    
    // Delete old files
    for (const file of filesToDelete) {
      try {
        await unlink(join(imagesDir, file.name));
      } catch (error) {
        console.error(`Failed to delete ${file.name}:`, error);
      }
    }
    
    return NextResponse.json({ 
      deleted: filesToDelete.length, 
      kept: filesToKeep.length 
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
