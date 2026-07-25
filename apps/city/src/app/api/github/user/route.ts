import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 });

    // fetch repos
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=20`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    const reposData = await reposRes.json();
    if (reposData.message) return NextResponse.json({ ok: false, error: reposData.message }, { status: 404 });

    // fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    const userData = await userRes.json();

    const projects = reposData
      .filter((r: any) => !r.fork)
      .slice(0, 6)
      .map((r: any) => ({
        name: r.name,
        desc: r.description || "No description",
        url: r.html_url,
        tech: [r.language || "N/A", ...(r.topics || []).slice(0, 3)],
        stars: r.stargazers_count,
        forks: r.forks_count,
      }));

    // derive skills from languages
    const langSet = new Set<string>();
    reposData.forEach((r: any) => { if (r.language) langSet.add(r.language); });

    return NextResponse.json({
      ok: true,
      data: {
        username,
        name: userData.name || username,
        bio: userData.bio || "",
        avatar: userData.avatar_url,
        followers: userData.followers,
        publicRepos: userData.public_repos,
        projects,
        languages: Array.from(langSet).slice(0, 8),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
