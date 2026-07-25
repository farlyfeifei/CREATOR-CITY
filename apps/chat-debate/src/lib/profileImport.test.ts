import { describe, expect, it } from "vitest";
import { profileQuestionnaireSteps } from "@/data/profileQuestionnaire";
import { getMissingRequiredProfileFields, parseProfileQuestionnaire } from "@/lib/profileImport";

function requiredAnswers(markdown = false) {
  return profileQuestionnaireSteps.map((step, stepIndex) => {
    const answers = step.fields
      .filter((field) => field.required)
      .map((field) => markdown
        ? `- **${field.label}：** 测试回答`
        : `${field.label}：测试回答`);
    return [`# ${stepIndex + 1}. ${step.title}`, ...answers].join("\n");
  }).join("\n\n");
}

describe("parseProfileQuestionnaire", () => {
  it("recognizes required answers wrapped in common Markdown formatting", () => {
    const result = parseProfileQuestionnaire(requiredAnswers(true));

    expect(result.missingRequired).toEqual([]);
    expect(result.draft.displayName).toBe("测试回答");
    expect(result.draft.publicInfo).toBe("测试回答");
  });

  it("derives missing fields from the current draft after manual corrections", () => {
    const result = parseProfileQuestionnaire(requiredAnswers().replace("显示名称：测试回答", "显示名称："));
    expect(result.missingRequired.map((field) => field.key)).toContain("displayName");

    result.draft.displayName = "补齐后的名称";
    expect(getMissingRequiredProfileFields(result.draft)).toEqual([]);
  });

  it("recognizes every current questionnaire label", () => {
    const allAnswers = profileQuestionnaireSteps.flatMap((step, stepIndex) => [
      `# ${stepIndex + 1}. ${step.title}`,
      ...step.fields.map((field) => `${field.label}：${field.key}`),
    ]).join("\n");

    const result = parseProfileQuestionnaire(allAnswers);
    const fieldCount = profileQuestionnaireSteps.reduce((count, step) => count + step.fields.length, 0);
    expect(result.recognizedFields).toBe(fieldCount);
    for (const step of profileQuestionnaireSteps) {
      for (const field of step.fields) expect(result.draft[field.key]).toBe(field.key);
    }
  });

  it("preserves valid answer characters while unwrapping paired Markdown", () => {
    const result = parseProfileQuestionnaire([
      "显示名称：_nankai",
      "一句话介绍自己：*nix 用户",
      "当前主要身份 / 职业：answer_",
      "长期生活或工作的领域：`产品研发`",
    ].join("\n"));

    expect(result.draft.displayName).toBe("_nankai");
    expect(result.draft.headline).toBe("*nix 用户");
    expect(result.draft.role).toBe("answer_");
    expect(result.draft.domains).toBe("产品研发");
  });
});
