import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const PAGE_SIZE = 12;

export async function POST(request: Request) {
  try {
    const { offset = 0 } = await request.json().catch(() => ({}));

    const { data, error, count } = await getSupabase()
      .from("quiz_results")
      .select("id, name, mbti_type, paragraph, selected_images, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    return NextResponse.json({ data, hasMore: count ? offset + PAGE_SIZE < count : false });
  } catch (error) {
    console.error("Community fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
