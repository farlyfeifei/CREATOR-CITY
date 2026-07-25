import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const SKILLS = [
  { name: "Browser Agent", q: "browser+automation+agent+stars:>100" },
  { name: "Coding Agent", q: "coding+agent+stars:>500" },
  { name: "Memory System", q: "memory+system+llm+stars:>100" },
  { name: "RAG Pipeline", q: "rag+pipeline+stars:>200" },
  { name: "Prompt Engineering", q: "prompt+engineering+stars:>200" },
  { name: "AI Product Design", q: "ai+design+tool+stars:>500" },
  { name: "Multi-Agent", q: "multi-agent+stars:>200" },
  { name: "AI Voice", q: "voice+ai+stars:>500" },
];

export async function GET() {
  try {
    const results = await Promise.all(
      SKILLS.map(async (s) => {
        try {
          const res = await fetch(
            `https://api.github.com/search/repositories?q=${s.q}&sort=stars&order=desc&per_page=1`,
            { headers: { Accept: "application/vnd.github.v3+json" } }
          );
          const data = await res.json();
          return {
            name: s.name,
            repoCount: data.total_count || 0,
            topRepo: data.items?.[0]?.full_name || "",
            topStars: data.items?.[0]?.stargazers_count || 0,
          };
        } catch {
          return { name: s.name, repoCount: 0, topRepo: "", topStars: 0 };
        }
      })
    );

    // Normalize to demand score
    const maxRepos = Math.max(...results.map(r => r.repoCount), 1);
    const scored = results
      .map(r => ({ ...r, demand: Math.round((r.repoCount / maxRepos) * 100) }))
      .sort((a, b) => b.demand - a.demand);

    return NextResponse.json({ ok: true, data: scored, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
