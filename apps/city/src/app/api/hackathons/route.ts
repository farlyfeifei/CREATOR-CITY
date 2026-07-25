import { competitions, type CityHackathonEvent } from "@/data/cityFacilities";

const MLH_EVENTS_URL = "https://www.mlh.com/seasons/2027/events";
const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const decodeHtml = (value: string) => value
  .replace(/&amp;/g, "&")
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, " ");

const stripHtml = (value: string) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function parseMlhEvents(html: string): CityHackathonEvent[] {
  const matches = html.matchAll(/<a[^>]+href="(https:\/\/events\.mlh\.io\/events\/[^"?]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
  const events: CityHackathonEvent[] = [];

  for (const match of matches) {
    const registrationUrl = decodeHtml(match[1]);
    const text = stripHtml(match[2]);
    const dateMatch = text.match(/^(.+?)\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s*-\s*(\d{1,2})\s+(.+?)\s+(Digital|Hybrid|In Person)$/i);
    if (!dateMatch) continue;

    const [, name, monthName, startDay, endDay, location, modeLabel] = dateMatch;
    const month = MONTHS[monthName.toUpperCase()];
    const year = month >= 7 ? 2026 : 2027;
    const endAt = new Date(Date.UTC(year, month - 1, Number(endDay), 23, 59, 59));
    if (endAt.getTime() < Date.now()) continue;

    const mode = modeLabel.toLowerCase() === "digital" ? "ONLINE" : modeLabel.toLowerCase() === "hybrid" ? "HYBRID" : "IN PERSON";
    events.push({
      id: registrationUrl.split("/").pop() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      organizer: "Major League Hacking",
      date: `${year}.${String(month).padStart(2, "0")}.${String(Number(startDay)).padStart(2, "0")} - ${String(month).padStart(2, "0")}.${String(Number(endDay)).padStart(2, "0")}`,
      deadline: "官方报名开放",
      location: location.replace(/,\s*Worldwide$/i, " · 全球"),
      mode,
      status: "报名中",
      tags: /agent/i.test(name) ? ["AI AGENT", "GLOBAL", "BUILD"] : /data/i.test(name) ? ["DATA", "AI", "GLOBAL"] : ["HACKATHON", "GLOBAL"],
      registrationUrl,
      sourceUrl: MLH_EVENTS_URL,
    });
  }

  return events;
}

export async function GET() {
  let liveEvents: CityHackathonEvent[] = [];
  let source = "官方报名入口快照";

  try {
    const response = await fetch(MLH_EVENTS_URL, {
      headers: { "User-Agent": "CreatorCity/0.2 (+https://github.com/xingchenyd)" },
      next: { revalidate: 60 * 60 * 6 },
    });
    if (response.ok) {
      liveEvents = parseMlhEvents(await response.text());
      if (liveEvents.length) source = "MLH 官方赛季页 · 实时读取";
    }
  } catch {
    liveEvents = [];
  }

  const merged = [...liveEvents, ...competitions].filter((event, index, all) =>
    all.findIndex((candidate) => candidate.registrationUrl === event.registrationUrl) === index,
  ).slice(0, 8);

  return Response.json({
    ok: true,
    data: merged,
    source,
    fetchedAt: new Date().toISOString(),
  });
}
