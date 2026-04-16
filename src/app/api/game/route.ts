import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SurnamePickRow {
  id: string;
  surname: string;
  hint: string | null;
}

interface RecentGameRow {
  surname_id: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent game surname IDs to avoid repeats
    const { data: recentGames } = await supabase
      .from("games")
      .select("surname_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentGameRow[]>();

    const recentIds = recentGames?.map((g) => g.surname_id) ?? [];

    // Get all surnames except recently played
    let query = supabase.from("surnames").select("id, surname, hint");

    if (recentIds.length > 0) {
      query = query.not("id", "in", `(${recentIds.join(",")})`);
    }

    const { data: surnames, error } = await query.returns<SurnamePickRow[]>();

    if (error || !surnames || surnames.length === 0) {
      const { data: fallback } = await supabase
        .from("surnames")
        .select("id, surname, hint")
        .limit(1)
        .returns<SurnamePickRow[]>();

      if (!fallback || fallback.length === 0) {
        return NextResponse.json(
          { error: "No surnames available" },
          { status: 404 }
        );
      }
      return NextResponse.json(fallback[0]);
    }

    const pick = surnames[Math.floor(Math.random() * surnames.length)];
    return NextResponse.json(pick);
  } catch (error) {
    console.error("Game route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
