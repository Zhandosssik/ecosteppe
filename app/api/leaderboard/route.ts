import { NextResponse } from "next/server";

import { unstable_cache } from "next/cache";

import {

  fetchLeaderboardCore,

  fetchLeaderboardMeta,

} from "@/lib/leaderboard/fetch-leaderboard";

import { isSupabaseConfigured } from "@/lib/supabase/env";

import type { LeaderboardPayload } from "@/types/leaderboard";



const CACHE_TAG = "leaderboard";

const REVALIDATE_SECONDS = 60;



const getCachedLeaderboardCore = unstable_cache(

  async () => fetchLeaderboardCore(),

  [CACHE_TAG],

  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },

);



function publicError(message: string, status: number) {

  return NextResponse.json({ error: message }, { status });

}



export async function GET(request: Request) {

  if (!isSupabaseConfigured()) {

    return publicError("Supabase не настроен", 503);

  }



  try {

    const { searchParams } = new URL(request.url);

    const bypassCache = searchParams.get("refresh") === "1";



    const core = bypassCache

      ? await fetchLeaderboardCore()

      : await getCachedLeaderboardCore();



    if (!core) {

      return publicError("Не удалось загрузить рейтинг", 503);

    }



    const meta = await fetchLeaderboardMeta();



    const data: LeaderboardPayload = {

      ...core,

      meta,

      fetchedAt: new Date().toISOString(),

    };



    return NextResponse.json(data, {

      headers: {

        "Cache-Control": `private, max-age=${REVALIDATE_SECONDS}, stale-while-revalidate=120`,

      },

    });

  } catch (e) {

    console.error("[leaderboard]", e);

    return publicError("Не удалось загрузить рейтинг", 500);

  }

}


