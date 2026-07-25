import { z } from "zod";
import type { CreatorProject, ProfileMediaAsset, UserProfile } from "../features/profile";
import { buildLocalMediaNarrative, parseNarrativeFacts, parseNarrativeTimestamps, shouldRegenerateNarrative } from "../features/mediaNarrative";

const baseSceneSchema = z.object({
  id: z.string(),
  durationInFrames: z.number().int().positive(),
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  sourceLabel: z.string(),
});

export const identitySceneSchema = baseSceneSchema.extend({
  type: z.literal("identity"),
  name: z.string(),
  role: z.string(),
});

export const timelineSceneSchema = baseSceneSchema.extend({
  type: z.literal("timeline"),
  items: z.array(z.object({
    period: z.string(),
    heading: z.string(),
    meta: z.string(),
    summary: z.string(),
  })),
});

export const evidenceSceneSchema = baseSceneSchema.extend({
  type: z.literal("evidence"),
  metrics: z.array(z.object({ label: z.string(), value: z.string(), context: z.string() })),
  awards: z.array(z.object({ title: z.string(), issuer: z.string(), date: z.string() })),
});

const narrativeBeatSchema = z.object({
  phase: z.enum(["hook", "context", "action", "evidence", "result", "reflection"]),
  title: z.string(),
  body: z.string(),
  visualCue: z.string(),
  layout: z.enum(["fullscreen", "split", "media-full"]),
  visual: z.enum(["kinetic", "network", "workflow", "metric", "compare", "media-focus"]),
  keywords: z.array(z.string()),
});

export const projectSceneSchema = baseSceneSchema.extend({
  type: z.literal("project"),
  projectId: z.string(),
  projectName: z.string(),
  projectUrl: z.string(),
  role: z.string(),
  impact: z.string(),
  tech: z.array(z.string()),
  highlights: z.array(z.string()),
  presentation: z.enum(["live", "browser", "architecture", "workflow"]),
  mediaUrl: z.string(),
  mediaType: z.enum(["video", "image", "document"]).optional(),
  accent: z.string(),
  secondary: z.string(),
  mediaClips: z.array(z.object({
    assetId: z.string(),
    name: z.string(),
    mediaUrl: z.string(),
    mediaType: z.enum(["video", "image", "document"]),
    purpose: z.string(),
    comment: z.string(),
    excerpt: z.string(),
    durationInSeconds: z.number(),
    narrativeBeats: z.array(narrativeBeatSchema),
  })),
  storyBeats: z.array(narrativeBeatSchema.extend({
    mediaIndex: z.number().int().nonnegative().optional(),
    trimStartInSeconds: z.number().nonnegative().optional(),
    trimDurationInSeconds: z.number().positive().optional(),
  })),
  architecture: z.array(z.string()),
  workflow: z.array(z.string()),
});

export const researchSceneSchema = baseSceneSchema.extend({
  type: z.literal("research"),
  papers: z.array(z.object({ title: z.string(), venue: z.string(), contribution: z.string() })),
});

export const skillsSceneSchema = baseSceneSchema.extend({
  type: z.literal("skills"),
  skills: z.array(z.object({ name: z.string(), level: z.number(), evidence: z.string() })),
});

export const closingSceneSchema = baseSceneSchema.extend({
  type: z.literal("closing"),
  name: z.string(),
  lookingFor: z.string(),
  links: z.array(z.string()),
});

export const creatorSceneSchema = z.discriminatedUnion("type", [
  identitySceneSchema,
  timelineSceneSchema,
  evidenceSceneSchema,
  projectSceneSchema,
  researchSceneSchema,
  skillsSceneSchema,
  closingSceneSchema,
]);

export const creatorStoryboardSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  fps: z.number().int().positive(),
  visualTheme: z.enum(["beijing-night", "paper-archive", "signal-lab", "gallery-white"]),
  scenes: z.array(creatorSceneSchema),
});

export type CreatorScene = z.infer<typeof creatorSceneSchema>;
export type CreatorStoryboard = z.infer<typeof creatorStoryboardSchema>;
export type ProjectScene = z.infer<typeof projectSceneSchema>;

export const getStoryboardDuration = (storyboard: CreatorStoryboard) =>
  storyboard.scenes.reduce((total, scene) => total + scene.durationInFrames, 0);

const TARGET_DURATION_SECONDS = 36;
const MAX_SHOWCASE_SCENES = 2;

const hasVideoMedia = (project: CreatorProject) => Boolean(project.mediaUrl && project.mediaType === "video");

function resolvePresentation(project: CreatorProject): ProjectScene["presentation"] {
  if (project.presentationMode === "live" && hasVideoMedia(project)) return "live";
  if (project.presentationMode !== "auto" && project.presentationMode !== "live") return project.presentationMode;
  if (hasVideoMedia(project)) return "live";
  if (project.architecture.length >= 2) return "architecture";
  if (project.workflow.length >= 2) return "workflow";
  return "browser";
}

const themePalettes = [
  { accent: "#f25f52", secondary: "#78d7c2" },
  { accent: "#f1c75b", secondary: "#69b8de" },
  { accent: "#ff7b54", secondary: "#91d3c4" },
  { accent: "#df5f7d", secondary: "#78c9b0" },
] as const;

const hashText = (value: string) => Array.from(value).reduce((total, character) => ((total * 31) + (character.codePointAt(0) || 0)) >>> 0, 7);

function resolveProjectTheme(project: CreatorProject) {
  return themePalettes[hashText(`${project.name}|${project.tech.join("|")}|${project.desc}`) % themePalettes.length];
}

function fallbackProjectAsset(project: CreatorProject): ProfileMediaAsset {
  return {
    id: `story-${project.id}`,
    name: project.name || "Project",
    mimeType: project.mediaType === "video" ? "video/mp4" : project.mediaType === "image" ? "image/webp" : "application/pdf",
    size: 0,
    kind: project.mediaType === "video" ? "project-video" : project.mediaType === "image" ? "project-image" : "project-document",
    purpose: project.mediaType === "video" ? "demo" : project.mediaType === "image" ? "photo" : "document",
    createdAt: new Date(0).toISOString(),
    projectId: project.id,
    comment: project.desc,
    analysisStatus: "draft",
    narrativeBeats: [],
  };
}

function buildProjectStoryBeats(
  project: CreatorProject,
  profile: UserProfile,
  mediaClips: ProjectScene["mediaClips"],
): ProjectScene["storyBeats"] {
  type StoryBeat = ProjectScene["storyBeats"][number];
  const clean = (value: string | undefined) => (value || "").replace(/\s+/g, " ").trim();
  const shorten = (value: string, length = 104) => value.length > length ? `${value.slice(0, length - 1)}…` : value;
  const comments = mediaClips.map((clip) => clip.comment).filter(Boolean);
  const commentFacts = comments.map(parseNarrativeFacts);
  const firstFact = (key: keyof ReturnType<typeof parseNarrativeFacts>) => clean(commentFacts.find((facts) => clean(facts[key]))?.[key]);
  const subject = clean(project.name) || "这个项目";
  const problem = firstFact("problem") || clean(project.desc);
  const role = firstFact("role") || clean(project.role);
  const actionParts = [firstFact("action"), ...project.workflow, ...project.highlights]
    .map(clean)
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .slice(0, 3);
  const action = actionParts.join(" → ");
  const result = firstFact("result") || clean(project.impact);
  const reflection = firstFact("reflection");
  const explicitEvidence = firstFact("evidence");
  const keywords = (...values: Array<string | string[] | undefined>) => [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value])
    .flatMap((value) => clean(value).split(/[，。；、|/：:·×→]/))
    .map(clean)
    .filter((value) => value.length >= 2 && value.length <= 20))].slice(0, 5);
  const videoIndices = mediaClips.map((clip, index) => clip.mediaType === "video" ? index : -1).filter((index) => index >= 0);
  const mediaIndices = videoIndices.length ? videoIndices : mediaClips.map((_, index) => index);
  const moments = videoIndices.flatMap((mediaIndex) => {
    const clip = mediaClips[mediaIndex];
    const explicit = parseNarrativeTimestamps(clip.comment)
      .filter((moment) => !clip.durationInSeconds || moment.seconds < clip.durationInSeconds)
      .map((moment) => ({ mediaIndex, start: moment.seconds, label: moment.label }));
    if (explicit.length) return explicit;
    const duration = clip.durationInSeconds;
    const ratios = [0.08, 0.38, 0.7];
    return ratios.map((ratio, index) => ({
      mediaIndex,
      start: duration > 0 ? Math.max(0, Math.min(duration - 2.8, duration * ratio)) : index * 2.8,
      label: "",
    }));
  });
  const momentFor = (index: number) => moments[index % Math.max(1, moments.length)];
  const mediaFor = (index: number) => mediaIndices[index % Math.max(1, mediaIndices.length)];
  const withMedia = (beat: StoryBeat, index: number, full = false): StoryBeat => {
    if (!mediaIndices.length) return beat;
    const moment = momentFor(index);
    const mediaIndex = moment?.mediaIndex ?? mediaFor(index);
    const duration = mediaClips[mediaIndex]?.durationInSeconds || 0;
    const start = moment?.start ?? 0;
    return {
      ...beat,
      layout: full && videoIndices.length ? "media-full" : "split",
      mediaIndex,
      trimStartInSeconds: Math.max(0, start),
      trimDurationInSeconds: duration > 0 ? Math.max(1.8, Math.min(3.4, duration - start)) : 3,
    };
  };
  const beat = (phase: StoryBeat["phase"], title: string, body: string, visual: StoryBeat["visual"], cue: string, beatKeywords: string[]): StoryBeat => ({
    phase,
    title: shorten(title, 36),
    body: shorten(body || "尚未提供对应事实，请在素材评论或项目资料中补充。"),
    visualCue: cue,
    layout: "fullscreen",
    visual,
    keywords: beatKeywords.length ? beatKeywords : [subject],
  });

  const hookBody = result
    ? `${profile.name || "创作者"}用 ${subject} 回答了一个具体问题：${problem || "项目资料中的核心命题"}。最后，以“${result}”作为可核验落点。`
    : `${profile.name || "创作者"}将从真实上传素材出发，说明 ${subject} 要解决什么、本人负责什么，以及画面能够证明什么。`;
  const contextBody = problem || "尚未提供明确的问题、目标用户或约束条件。";
  const actionBody = [role ? `我的职责是${role}` : "职责边界尚未提供", action ? `关键推进顺序是：${action}` : "具体行动尚未提供"].join("；");
  const evidenceMoment = momentFor(2);
  const evidenceLabel = evidenceMoment?.label || explicitEvidence;
  const evidenceBody = evidenceLabel
    ? `这段真实画面重点展示：${evidenceLabel}。它用于支撑前面的行动说明，而不是作为装饰素材。`
    : "这里直接播放上传素材中的代表片段，用真实界面、操作过程或路演画面支撑项目说明。";
  const outcomeBody = [result ? `可核验结果：${result}` : "结果或影响尚未提供", reflection ? `方法复盘：${reflection}` : ""].filter(Boolean).join("；");

  const beats: StoryBeat[] = [
    beat("hook", `${profile.name || "创作者"} · ${subject}`, hookBody, "kinetic", "先建立人物、项目与核心问题之间的关系。", keywords(profile.name, subject, result)),
    withMedia(beat("context", `先说明为什么做 ${subject}`, contextBody, "network", "左侧交代问题，右侧在两秒内进入第一段真实视频。", keywords(problem, subject)), 0),
    withMedia(beat("action", role ? `我负责：${role}` : "职责与关键行动", actionBody, "workflow", "动作按用户填写的职责、流程和亮点依次推进。", keywords(role, actionParts, project.tech)), 1),
    withMedia(beat("evidence", evidenceMoment ? `重点片段 · ${Math.floor(evidenceMoment.start / 60).toString().padStart(2, "0")}:${Math.floor(evidenceMoment.start % 60).toString().padStart(2, "0")}` : "真实画面证据", evidenceBody, "media-focus", "重点片段短暂全屏，让观众看清真实产品或路演证据。", keywords(evidenceLabel, explicitEvidence, subject)), 2, true),
    withMedia(beat(result ? "result" : "reflection", result ? `${subject} 的结果与复盘` : `${subject} 留下的方法`, outcomeBody, result && /\d|%|倍|项|人|次/.test(result) ? "metric" : "compare", "将结果、方法与人物能力收束为同一结论。", keywords(result, reflection, project.highlights)), 3),
  ];
  return beats;
}

function fitStoryboardDuration(scenes: CreatorScene[], fps: number): CreatorScene[] {
  const targetFrames = TARGET_DURATION_SECONDS * fps;
  const currentFrames = scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
  const scale = targetFrames / Math.max(1, currentFrames);
  const paced = scenes.map((scene) => ({
    ...scene,
    durationInFrames: Math.max(3 * fps, Math.round(scene.durationInFrames * scale)),
  }));
  const roundedFrames = paced.reduce((total, scene) => total + scene.durationInFrames, 0);
  const last = paced[paced.length - 1];
  if (last) last.durationInFrames += targetFrames - roundedFrames;
  return paced;
}

export function buildCreatorStoryboard(profile: UserProfile): CreatorStoryboard {
  const fps = 30;
  const experiences = profile.experiences.filter((item) => item.organization || item.role || item.period || item.summary || item.highlights.length);
  const education = profile.education.filter((item) => item.school || item.degree || item.field || item.period || item.result);
  const metrics = profile.metrics.filter((item) => item.label || item.value || item.context);
  const awards = profile.awards.filter((item) => item.title || item.issuer || item.date || item.detail);
  const papers = profile.papers.filter((item) => item.title || item.url || item.venue || item.contribution);
  const skills = profile.skills.filter((item) => item.name || item.evidence);
  const projects = profile.projects.filter((project) => project.name || project.desc || project.url || project.mediaUrl || project.mediaAssetIds.length || project.tech.length || project.highlights.length);
  const scenes: CreatorScene[] = [
    {
      id: "identity",
      type: "identity",
      durationInFrames: Math.round(3.5 * fps),
      eyebrow: "CREATOR SIGNAL / BEIJING",
      title: profile.bio || "把想法变成可以运行的作品",
      subtitle: profile.narrative || profile.resume || "欢迎来到我的数字展厅。",
      sourceLabel: "个人描述",
      name: profile.name || "Creator",
      role: profile.title || "AI Creator",
    },
  ];

  const timelineItems = [
    ...experiences.map((item) => ({
      period: item.period,
      heading: item.role,
      meta: item.organization,
      summary: item.summary || item.highlights.join(" · "),
    })),
    ...education.map((item) => ({
      period: item.period,
      heading: [item.degree, item.field].filter(Boolean).join(" · "),
      meta: item.school,
      summary: item.result || "教育经历",
    })),
  ].filter((item) => item.heading || item.meta).slice(0, 4);

  if (timelineItems.length) {
    scenes.push({
      id: "timeline",
      type: "timeline",
      durationInFrames: 3 * fps,
      eyebrow: "01 / TRAJECTORY",
      title: "我如何走到这里",
      subtitle: "不是职位清单，而是持续积累的能力证据。",
      sourceLabel: "经历 + 教育",
      items: timelineItems,
    });
  }

  if (metrics.length || awards.length) {
    scenes.push({
      id: "evidence",
      type: "evidence",
      durationInFrames: 3 * fps,
      eyebrow: "02 / EVIDENCE",
      title: "让结果先说话",
      subtitle: profile.transcript || "成绩、奖项与可核验的影响。",
      sourceLabel: "成绩 + 奖项",
      metrics: metrics.slice(0, 4).map((item) => ({ label: item.label, value: item.value, context: item.context || "" })),
      awards: awards.slice(0, 3).map((item) => ({ title: item.title, issuer: item.issuer, date: item.date })),
    });
  }

  const experienceMedia = profile.mediaAssets.filter((asset) => !asset.projectId && asset.experienceId && asset.kind !== "resume" && asset.runtimeUrl).slice(0, 1);
  const filmPriority = ["project-creator-city", "project-colorbook", "project-scrap-loop", "reference-mooncut", "reference-roundtable"];
  const prioritizedProjects = projects
    .map((project, sourceIndex) => {
      const assetIds = new Set([...(project.mediaAssetIds || []), project.mediaAssetId || ""].filter(Boolean));
      const hasUploadedMedia = profile.mediaAssets.some((asset) => asset.runtimeUrl && (asset.projectId === project.id || assetIds.has(asset.id)));
      const priorityIndex = filmPriority.indexOf(project.id);
      const score = (hasUploadedMedia ? 1000 : 0)
        + (project.mediaType === "video" ? 180 : project.mediaUrl ? 120 : 0)
        + (project.ownership === "owned" ? 80 : 0)
        + (priorityIndex >= 0 ? 50 - priorityIndex : 0)
        - sourceIndex * .01;
      return { project, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, MAX_SHOWCASE_SCENES - experienceMedia.length))
    .map(({ project }) => project);

  prioritizedProjects.forEach((project, index) => {
    let presentation = resolvePresentation(project);
    const projectAssetIds = new Set([...(project.mediaAssetIds || []), project.mediaAssetId || ""].filter(Boolean));
    const mediaClips = profile.mediaAssets
      .filter((asset) => (asset.projectId === project.id || projectAssetIds.has(asset.id)) && asset.kind !== "resume" && asset.runtimeUrl)
      .map((asset) => ({
        assetId: asset.id,
        name: asset.name,
        mediaUrl: asset.runtimeUrl || "",
        mediaType: asset.kind === "project-video" ? "video" as const : asset.kind === "project-image" ? "image" as const : "document" as const,
        purpose: asset.purpose,
        comment: asset.comment,
        excerpt: asset.extractedText || "",
        durationInSeconds: asset.durationInSeconds || 0,
        narrativeBeats: asset.narrativeBeats.length && !shouldRegenerateNarrative(asset.narrativeBeats) ? asset.narrativeBeats : buildLocalMediaNarrative(asset, profile),
      }))
      .sort((left, right) => (left.mediaType === "video" ? 0 : 1) - (right.mediaType === "video" ? 0 : 1));
    if (mediaClips.some((clip) => clip.mediaType === "video")) presentation = "live";
    const storyBeats = buildProjectStoryBeats(project, profile, mediaClips);
    const theme = resolveProjectTheme(project);
    scenes.push({
      id: `project-${project.id || index}`,
      type: "project",
      durationInFrames: 12 * fps,
      eyebrow: `0${scenes.length} / PROJECT`,
      title: project.name || `Project ${index + 1}`,
      subtitle: project.desc || "项目说明待补充",
      sourceLabel: project.ownership === "reference"
        ? `${project.sourceOwner || "外部作者"} 产品 / 架构参考（非本人项目）`
        : mediaClips.length ? `${mediaClips.length} 份叙事素材` : presentation === "live" ? "实机视频" : presentation === "architecture" ? "架构说明" : presentation === "workflow" ? "流程说明" : "本人 GitHub 项目",
      projectId: project.id,
      projectName: project.name,
      projectUrl: project.url || "",
      role: project.role || "职责待补充",
      impact: project.impact || "结果待补充",
      tech: project.tech.slice(0, 5),
      highlights: project.highlights.slice(0, 4),
      presentation,
      mediaUrl: project.mediaUrl || "",
      mediaType: project.mediaType,
      accent: theme.accent,
      secondary: theme.secondary,
      mediaClips,
      storyBeats,
      architecture: project.architecture.slice(0, 5),
      workflow: project.workflow.slice(0, 5),
    });
  });

  experienceMedia.slice(0, Math.max(0, MAX_SHOWCASE_SCENES - prioritizedProjects.length)).forEach((asset, index) => {
    const experience = experiences.find((item) => item.id === asset.experienceId);
    if (!experience) return;
    const mediaType = asset.kind === "project-video" ? "video" as const : asset.kind === "project-image" ? "image" as const : "document" as const;
    const narrativeBeats = asset.narrativeBeats.length && !shouldRegenerateNarrative(asset.narrativeBeats) ? asset.narrativeBeats : buildLocalMediaNarrative(asset, profile);
    const experienceProject: CreatorProject = {
      id: `experience-${experience.id}`,
      name: experience.organization || experience.role,
      desc: experience.summary,
      tech: skills.slice(0, 4).map((skill) => skill.name).filter(Boolean),
      role: experience.role,
      impact: experience.highlights[0] || asset.comment,
      highlights: experience.highlights,
      presentationMode: mediaType === "video" ? "live" : "browser",
      mediaUrl: asset.runtimeUrl,
      mediaType,
      mediaAssetIds: [asset.id],
      architecture: [],
      workflow: [],
      ownership: "owned",
    };
    const mediaClips = [{ assetId: asset.id, name: asset.name, mediaUrl: asset.runtimeUrl || "", mediaType, purpose: asset.purpose, comment: asset.comment, excerpt: asset.extractedText || "", durationInSeconds: asset.durationInSeconds || 0, narrativeBeats }];
    const storyBeats = buildProjectStoryBeats(experienceProject, profile, mediaClips);
    const theme = resolveProjectTheme(experienceProject);
    scenes.push({
      id: `experience-media-${asset.id || index}`,
      type: "project",
      durationInFrames: 12 * fps,
      eyebrow: `0${scenes.length} / EXPERIENCE FILM`,
      title: experience.organization || experience.role || "实践经历",
      subtitle: experience.summary || asset.comment || "一段由真实素材支撑的经历",
      sourceLabel: "经历素材",
      projectId: `experience-${experience.id}`,
      projectName: experience.organization || experience.role,
      projectUrl: "",
      role: experience.role || "职责待补充",
      impact: experience.highlights[0] || asset.comment || "结果待补充",
      tech: skills.slice(0, 4).map((skill) => skill.name).filter(Boolean),
      highlights: experience.highlights.slice(0, 4),
      presentation: mediaType === "video" ? "live" : "browser",
      mediaUrl: asset.runtimeUrl || "",
      mediaType,
      accent: theme.accent,
      secondary: theme.secondary,
      mediaClips,
      storyBeats,
      architecture: [],
      workflow: [],
    });
  });

  if (papers.length) {
    scenes.push({
      id: "research",
      type: "research",
      durationInFrames: 3 * fps,
      eyebrow: "RESEARCH / FIELD NOTES",
      title: "研究如何进入产品",
      subtitle: "把问题、方法与贡献压缩为可读的研究卡片。",
      sourceLabel: "论文",
      papers: papers.slice(0, 3).map((paper) => ({
        title: paper.title,
        venue: paper.venue || "Research",
        contribution: paper.contribution || "连接研究发现与下一步产品验证",
      })),
    });
  }

  if (!papers.length && skills.length) {
    scenes.push({
      id: "skills",
      type: "skills",
      durationInFrames: 3 * fps,
      eyebrow: "CAPABILITY / PROOF",
      title: "技能背后有作品",
      subtitle: "能力不仅是一条进度条，也对应具体证据。",
      sourceLabel: "技能",
      skills: skills.slice(0, 6).map((skill) => ({ name: skill.name || "技能待补充", level: skill.level, evidence: skill.evidence || "证据待补充" })),
    });
  }

  scenes.push({
    id: "closing",
    type: "closing",
    durationInFrames: Math.round(3.5 * fps),
    eyebrow: "LET'S BUILD",
    title: "下一件作品，和谁一起完成？",
    subtitle: profile.lookingFor || "欢迎从项目、研究或一个具体问题开始交流。",
    sourceLabel: "合作方向",
    name: profile.name || "Creator",
    lookingFor: profile.lookingFor || "AI 创作工具与开源产品方向的合作者",
    links: [profile.githubUsername ? `github.com/${profile.githubUsername}` : "", ...profile.projectLinks].filter(Boolean).slice(0, 3),
  });

  return creatorStoryboardSchema.parse({
    version: 1,
    title: `${profile.name || "Creator"} / Creator Signal`,
    fps,
    visualTheme: profile.videoTheme,
    scenes: fitStoryboardDuration(scenes, fps),
  });
}
