import { XMLParser } from "fast-xml-parser";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

type NewsItem = { id: string; title: string; url: string; source: string; publishedAt: string; summary: string; category: "AI" | "CODING" | "AGENT" | "GITHUB" };

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const asArray = <T,>(value: T | T[] | undefined): T[] => value ? Array.isArray(value) ? value : [value] : [];
const clean = (value: unknown) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);

async function readRss(url: string, source: string, category: NewsItem["category"]): Promise<NewsItem[]> {
  const response = await fetch(url, { next: { revalidate: 1800 }, headers: { "User-Agent": "Creator-City/0.2" } });
  if (!response.ok) throw new Error(`${source} ${response.status}`);
  const document = parser.parse(await response.text());
  const rssItems = asArray<Record<string, unknown>>(document?.rss?.channel?.item);
  const atomItems = asArray<Record<string, unknown>>(document?.feed?.entry);
  return [...rssItems, ...atomItems].slice(0, 6).map((item, index) => {
    const link = typeof item.link === "object" && item.link ? String((item.link as Record<string, unknown>)["@_href"] || "") : String(item.link || "");
    const title = clean(item.title);
    return { id: `${source}-${index}-${title}`, title, url: link, source, publishedAt: String(item.pubDate || item.published || item.updated || ""), summary: clean(item.description || item.summary || item.content), category };
  }).filter((item) => item.title && item.url);
}

async function readGithub(): Promise<NewsItem[]> {
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const topics = ["topic:ai-agent", "topic:ai-coding", "topic:llm"];
  const responses = await Promise.all(topics.map(async (topic) => {
    const query = new URLSearchParams({ q: `${topic} stars:>500 pushed:>${since}`, sort: "updated", order: "desc", per_page: "4" });
    const response = await fetch(`https://api.github.com/search/repositories?${query}`, { next: { revalidate: 1800 }, headers: { Accept: "application/vnd.github+json", "User-Agent": "Creator-City/0.2" } });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    return (await response.json()).items || [];
  }));
  const unique = [...new Map(responses.flat().map((repo: Record<string, unknown>) => [repo.id, repo])).values()];
  return unique.slice(0, 10).map((repo) => ({ id: `github-${repo.id}`, title: String(repo.full_name), url: String(repo.html_url), source: "GitHub", publishedAt: String(repo.pushed_at), summary: clean(repo.description), category: "GITHUB" as const }));
}

const fallback: NewsItem[] = [
  { id: "fallback-codex", title: "openai/codex: terminal coding agent", url: "https://github.com/openai/codex", source: "GitHub", publishedAt: "2026-07-24", summary: "持续更新的开源编码 Agent，适合观察本地执行、审批与工具调用设计。", category: "CODING" },
  { id: "fallback-agents", title: "OpenAI Agents", url: "https://openai.com/index/new-tools-for-building-agents/", source: "OpenAI", publishedAt: "2025-03-11", summary: "官方 Agent 构建工具与工作流更新。", category: "AGENT" },
  { id: "fallback-github", title: "GitHub Copilot product updates", url: "https://github.blog/ai-and-ml/github-copilot/", source: "GitHub Blog", publishedAt: "2026-07", summary: "GitHub Copilot、coding agent 与开发工作流更新入口。", category: "CODING" },
];

export async function GET() {
  const feeds = await Promise.allSettled([
    readRss("https://openai.com/news/rss.xml", "OpenAI", "AI"),
    readRss("https://github.blog/feed/", "GitHub Blog", "CODING"),
    readGithub(),
  ]);
  const relevant = /\b(ai|copilot|agent|coding|code|model|llm|developer|prompt)\b/i;
  const data = feeds.flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((item) => item.source !== "GitHub Blog" || relevant.test(`${item.title} ${item.summary}`));
  return NextResponse.json({ ok: true, data: data.length ? data.slice(0, 24) : fallback, sources: ["OpenAI RSS", "GitHub Blog RSS", "GitHub Search API"], fetchedAt: new Date().toISOString(), fallback: !data.length });
}
