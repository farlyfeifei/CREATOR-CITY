import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "stars:>1000";
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=12`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    const data = await res.json();
    const repos = (data.items || []).map((r: any) => ({
      id: r.id,
      name: r.full_name,
      url: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      lang: r.language || "N/A",
      summary: r.description || "",
      tags: r.topics || [],
      pushedAt: r.pushed_at,
    }));
    return NextResponse.json({ ok: true, data: repos, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
