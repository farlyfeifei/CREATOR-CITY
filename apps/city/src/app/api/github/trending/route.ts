import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const GH = "https://api.github.com/search/repositories";

export async function GET() {
  try {
    const queries = [
      { label: "AI Agent", q: "topic:ai-agent+stars:>1000", sort: "stars" },
      { label: "AI Coding", q: "topic:ai-coding+stars:>500", sort: "stars" },
      { label: "RAG", q: "topic:rag+stars:>500", sort: "stars" },
      { label: "Multimodal", q: "topic:multimodal+stars:>500", sort: "stars" },
    ];

    const results = await Promise.all(
      queries.map(async (query) => {
        const res = await fetch(
          `${GH}?q=${query.q}&sort=${query.sort}&order=desc&per_page=5`,
          { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        const data = await res.json();
        return {
          label: query.label,
          repos: (data.items || []).map((r: any) => ({
            id: r.id,
            name: r.full_name,
            url: r.html_url,
            stars: r.stargazers_count,
            forks: r.forks_count,
            lang: r.language || "N/A",
            summary: r.description || "",
            tags: r.topics || [],
            pushedAt: r.pushed_at,
          })),
        };
      })
    );

    return NextResponse.json({ ok: true, data: results, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
