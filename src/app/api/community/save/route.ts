import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { name, mbtiType, paragraph, traitBreakdown, selectedImages } =
      await request.json();

    const { data, error } = await getSupabase()
      .from("quiz_results")
      .insert({
        name,
        mbti_type: mbtiType,
        paragraph,
        trait_breakdown: traitBreakdown,
        selected_images: selectedImages,
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
