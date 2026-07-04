// Supabase Edge Function: sync-wc-results
// يجلب نتائج كأس العالم 2026 من football-data.org ويحدّث جدول wc_store تلقائيًا
// بدون أي تدخل من الأدمن.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FD_TOKEN = Deno.env.get("FOOTBALL_DATA_TOKEN")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// خريطة: اسم الفريق في football-data.org -> الكود الداخلي عندنا
const NAME_TO_CODE: Record<string, string> = {
  "Paraguay": "PAR", "France": "FRA", "Canada": "CAN", "Morocco": "MAR",
  "Portugal": "POR", "Spain": "ESP", "United States": "USA", "USA": "USA",
  "Belgium": "BEL", "Brazil": "BRA", "Norway": "NOR", "Mexico": "MEX",
  "England": "ENG", "Argentina": "ARG", "Egypt": "EGY", "Switzerland": "SUI",
  "Colombia": "COL"
};
function codeOf(apiTeamName: string): string | null {
  if (NAME_TO_CODE[apiTeamName]) return NAME_TO_CODE[apiTeamName];
  const hit = Object.keys(NAME_TO_CODE).find(k => apiTeamName.includes(k) || k.includes(apiTeamName));
  return hit ? NAME_TO_CODE[hit] : null;
}

// بنية البطولة عندنا (يجب أن تطابق index.html/knockout.html بالضبط)
const M16: Record<string, [string, string]> = {
  m1: ["PAR", "FRA"], m2: ["CAN", "MAR"], m3: ["POR", "ESP"], m4: ["USA", "BEL"],
  m5: ["BRA", "NOR"], m6: ["MEX", "ENG"], m7: ["ARG", "EGY"], m8: ["SUI", "COL"]
};
const NEXT: Record<string, [string, string]> = {
  qf1: ["m1", "m2"], qf2: ["m3", "m4"], qf3: ["m5", "m6"], qf4: ["m7", "m8"],
  sf1: ["qf1", "qf2"], sf2: ["qf3", "qf4"], final: ["sf1", "sf2"]
};
const STAGE_OF: Record<string, string> = {
  m1:"LAST_16",m2:"LAST_16",m3:"LAST_16",m4:"LAST_16",m5:"LAST_16",m6:"LAST_16",m7:"LAST_16",m8:"LAST_16",
  qf1:"QUARTER_FINALS",qf2:"QUARTER_FINALS",qf3:"QUARTER_FINALS",qf4:"QUARTER_FINALS",
  sf1:"SEMI_FINALS",sf2:"SEMI_FINALS",final:"FINAL"
};

async function getStore(key: string) {
  const { data } = await sb.from("wc_store").select("v").eq("k", key).maybeSingle();
  return data?.v || {};
}
async function setStore(key: string, value: unknown) {
  await sb.from("wc_store").upsert({ k: key, v: value, updated_at: new Date().toISOString() }, { onConflict: "k" });
}

Deno.serve(async () => {
  const actual = await getStore("actual-results");     // { matchId: winnerCode }
  const scores = await getStore("ko-actual-scores");    // { matchId: {a,b,winner} }

  // حل الفريقين الحاليين لكل مباراة حسب حالة actual الآن
  function resolvedPair(id: string): [string | null, string | null] {
    if (M16[id]) return M16[id];
    const [fa, fb] = NEXT[id];
    return [actual[fa] || null, actual[fb] || null];
  }

  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": FD_TOKEN }
  });
  if (!res.ok) return new Response("fetch failed: " + res.status, { status: 500 });
  const json = await res.json();
  const apiMatches = json.matches || [];

  let changed = false;

  for (const id of Object.keys(STAGE_OF)) {
    if (actual[id]) continue; // محسومة أصلاً
    const [a, b] = resolvedPair(id);
    if (!a || !b) continue; // الفريقان لم يُحسما بعد

    const stage = STAGE_OF[id];
    const match = apiMatches.find((m: any) => {
      if (m.stage !== stage || m.status !== "FINISHED") return false;
      const hc = codeOf(m.homeTeam?.name || "");
      const ac = codeOf(m.awayTeam?.name || "");
      return (hc === a && ac === b) || (hc === b && ac === a);
    });
    if (!match) continue;

    const hc = codeOf(match.homeTeam.name);
    const winner = match.score.winner === "HOME_TEAM" ? hc
                 : match.score.winner === "AWAY_TEAM" ? (hc === a ? b : a)
                 : null;
    if (!winner) continue;

    actual[id] = winner;
    scores[id] = {
      a: match.score.fullTime.home, b: match.score.fullTime.away, winner
    };
    changed = true;
  }

  if (changed) {
    await setStore("actual-results", actual);
    await setStore("ko-actual-scores", scores);
  }
  return new Response(JSON.stringify({ ok: true, changed }), { headers: { "Content-Type": "application/json" } });
});
