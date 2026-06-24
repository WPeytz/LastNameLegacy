import { NextRequest, NextResponse } from "next/server";
import { createClient, bearerToken } from "@/lib/supabase/server";
import { isGameMode, type GameMode } from "@/lib/types/database";

interface SubjectPickRow {
  id: string;
  surname: string;
  hint: string | null;
}

interface RecentGameRow {
  surname_id: string | null;
  living_person_id: string | null;
}

function tableForMode(mode: GameMode) {
  return mode === "living" ? "living_people" : "surnames";
}

function subjectIdColumnForMode(mode: GameMode) {
  return mode === "living" ? "living_person_id" : "surname_id";
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);
    const supabase = await createClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawMode = request.nextUrl.searchParams.get("mode");
    const mode: GameMode = isGameMode(rawMode) ? rawMode : "historical";
    const table = tableForMode(mode);
    const subjectColumn = subjectIdColumnForMode(mode);

    // Recent subject IDs in this mode to avoid repeats.
    const { data: recentGames } = await supabase
      .from("games")
      .select("surname_id, living_person_id")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentGameRow[]>();

    const recentIds =
      recentGames
        ?.map((g) => (subjectColumn === "living_person_id" ? g.living_person_id : g.surname_id))
        .filter((id): id is string => !!id) ?? [];

    let query = supabase.from(table).select("id, surname, hint");

    if (recentIds.length > 0) {
      query = query.not("id", "in", `(${recentIds.join(",")})`);
    }

    const { data: subjects, error } = await query.returns<SubjectPickRow[]>();

    if (error || !subjects || subjects.length === 0) {
      const { data: fallback } = await supabase
        .from(table)
        .select("id, surname, hint")
        .limit(1)
        .returns<SubjectPickRow[]>();

      if (!fallback || fallback.length === 0) {
        return NextResponse.json(
          { error: "No subjects available" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ...fallback[0], mode });
    }

    const pick = subjects[Math.floor(Math.random() * subjects.length)];
    return NextResponse.json({ ...pick, mode });
  } catch (error) {
    console.error("Game route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
