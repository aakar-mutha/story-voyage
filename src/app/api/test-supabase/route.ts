import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('books')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Supabase connection working",
      data 
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    });
  }
}
