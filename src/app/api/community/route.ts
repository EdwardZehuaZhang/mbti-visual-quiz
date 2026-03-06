import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST() {
  try {
    const { data, error } = await getSupabase()
      .from("quiz_results")
      .select("id, name, mbti_type, paragraph, selected_images, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Community fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
