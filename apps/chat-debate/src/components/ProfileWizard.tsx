import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardPaste, ListChecks, ScanText, ShieldCheck, X } from "lucide-react";
import { profileQuestionnaireSteps } from "@/data/profileQuestionnaire";
import { emptyProfileDraft } from "@/lib/profileCompiler";
import { parseProfileQuestionnaire, type ProfileImportResult } from "@/lib/profileImport";
import type { ProfileDraft } from "@/types";

type WizardMode = "choose" | "paste" | "form";

export function ProfileWizard({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (draft: ProfileDraft) => void;
}) {
  const [mode, setMode] = useState<WizardMode>("choose");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [pastedText, setPastedText] = useState("");
  const [importResult, setImportResult] = useState<ProfileImportResult | null>(null);
  const currentStep = profileQuestionnaireSteps[step];
  const canContinue = useMemo(
    () => currentStep.fields
      .filter((item) => item.required)
      .every((item) => draft[item.key].trim()),
    [currentStep, draft],
  );

  const field = (key: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const parsePaste = () => {
    const result = parseProfileQuestionnaire(pastedText);
    setDraft(result.draft);
    setImportResult(result);
  };

  const inspectImportedDraft = () => {
    setStep(importResult?.missingRequired[0]?.stepIndex ?? 0);
    setMode("form");
  };

  const subtitle = mode === "choose"
    ? "选择填写方式"
    : mode === "paste"
      ? "完整粘贴 12 组回答"
      : `${currentStep.title} · ${step + 1}/${profileQuestionnaireSteps.length}`;

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <header className="sheet-header">
          <button className="icon-button" onClick={onClose} title="关闭"><X size={19} /></button>
          <div>
            <h2 id="profile-title">创建个人 Agent</h2>
            <span>{subtitle}</span>
          </div>
          <div className="sheet-header-spacer" />
        </header>

        {mode === "choose" && (
          <>
            <div className="sheet-body profile-mode-body">
              <div className="questionnaire-intro">
                <strong>选择一种创建方式</strong>
                <p>两种方式最终都会使用同一个人物画像程序、资料权限和对话规则。</p>
              </div>
              <div className="profile-mode-grid">
                <button className="profile-mode-card" onClick={() => setMode("paste")}>
                  <span><ClipboardPaste size={24} /></span>
                  <strong>全部粘贴</strong>
                  <p>把已经回答完成的 12 组问题一次性粘贴进来，自动识别并生成画像。</p>
                  <em>适合已经在其他地方整理好答案</em>
                </button>
                <button className="profile-mode-card" onClick={() => setMode("form")}>
                  <span><ListChecks size={24} /></span>
                  <strong>一点一点填写</strong>
                  <p>按照原来的方式，逐组填写身份、经历、判断方式、表达样本和权限。</p>
                  <em>适合边思考边完善答案</em>
                </button>
              </div>
            </div>
            <footer className="sheet-footer sheet-footer-muted"><span>个人资料只保存在当前浏览器。</span></footer>
          </>
        )}

        {mode === "paste" && (
          <>
            <div className="sheet-body">
              <div className="questionnaire-intro">
                <strong>粘贴完整的 12 组回答</strong>
                <p>请保留“基本身份”“显示名称：”“经历 1：”等原有标题。解析只整理你提供的内容，不会补写经历或替你猜测答案。</p>
              </div>
              <section className="paste-questionnaire-reference" aria-labelledby="paste-questionnaire-title">
                <div className="paste-questionnaire-reference-heading">
                  <strong id="paste-questionnaire-title">完整的 12 组问题</strong>
                  <span>请按下面的问题整理答案，再粘贴到下方输入框</span>
                </div>
                <div className="paste-questionnaire-reference-list">
                  {profileQuestionnaireSteps.map((questionnaireStep, stepIndex) => (
                    <section className="paste-questionnaire-group" key={questionnaireStep.title}>
                      <h3>{stepIndex + 1}. {questionnaireStep.title}</h3>
                      <ul>
                        {questionnaireStep.fields.map((item) => {
                          const showStructuredQuestions = item.key.startsWith("experience") || item.key.startsWith("project");
                          return (
                            <li key={item.key}>
                              <span>{item.label}：</span>
                              {showStructuredQuestions && (
                                <ul>
                                  {item.placeholder.split("\n").filter(Boolean).map((line) => <li key={line}>{line}</li>)}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </section>
              <label className="paste-import-field">
                <span>在这里粘贴填写完成的内容</span>
                <textarea
                  value={pastedText}
                  onChange={(event) => {
                    setPastedText(event.target.value);
                    setImportResult(null);
                  }}
                  placeholder="# 1. 基本身份&#10;显示名称：&#10;一句话介绍自己：&#10;……&#10;&#10;# 12. Agent 权限&#10;可以公开的信息：&#10;……"
                />
              </label>
              {importResult && <ImportResultPanel result={importResult} />}
            </div>
            <footer className="sheet-footer">
              <button className="secondary-button" onClick={() => setMode("choose")}><ArrowLeft size={17} />返回选择</button>
              <div className="sheet-footer-actions">
                {importResult ? (
                  <>
                    <button className="secondary-button" onClick={inspectImportedDraft}><ScanText size={16} />逐项检查</button>
                    <button className="primary-button" disabled={importResult.missingRequired.length > 0} onClick={() => onSave(draft)}><Check size={17} />生成 Agent</button>
                  </>
                ) : (
                  <button className="primary-button" disabled={!pastedText.trim()} onClick={parsePaste}><ScanText size={17} />识别内容</button>
                )}
              </div>
            </footer>
          </>
        )}

        {mode === "form" && (
          <>
            <div className="questionnaire-progress" aria-label="问卷进度">
              <span>{currentStep.title}</span>
              <div><i style={{ width: `${((step + 1) / profileQuestionnaireSteps.length) * 100}%` }} /></div>
              <em>{step + 1}/{profileQuestionnaireSteps.length}</em>
            </div>

            <div className="sheet-body">
              <div className="questionnaire-intro">
                <strong>{currentStep.title}</strong>
                <p>{currentStep.description}</p>
              </div>
              {importResult && <div className="import-review-note"><ScanText size={17} /><span>整段内容已经填入问卷。请检查识别结果，需要时直接修改。</span></div>}
              {step === profileQuestionnaireSteps.length - 1 && (
                <div className="privacy-banner"><ShieldCheck size={19} /><span>Profile 只保存在当前浏览器。权限边界优先于人物模仿，禁止信息不会进入公开证据。</span></div>
              )}
              <div className="form-grid">
                {currentStep.fields.map((item) => (
                  <Field
                    key={item.key}
                    label={item.label}
                    required={item.required}
                    value={draft[item.key]}
                    onChange={(value) => field(item.key, value)}
                    placeholder={item.placeholder}
                    multiline={item.multiline}
                    tall={item.tall}
                    className={item.tall ? "form-span" : ""}
                  />
                ))}
              </div>
            </div>

            <footer className="sheet-footer">
              <button className="secondary-button" onClick={() => step === 0 ? setMode("choose") : setStep((value) => value - 1)}><ArrowLeft size={17} />{step === 0 ? "返回选择" : "上一步"}</button>
              {step < profileQuestionnaireSteps.length - 1 ? (
                <button className="primary-button" disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>下一步<ArrowRight size={17} /></button>
              ) : (
                <button className="primary-button" disabled={!canContinue} onClick={() => onSave(draft)}><Check size={17} />生成 Agent</button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function ImportResultPanel({ result }: { result: ProfileImportResult }) {
  const hasRecognizedContent = result.filledFields > 0;
  return (
    <div className={`import-result ${result.missingRequired.length ? "has-missing" : "is-ready"}`}>
      <div className="import-result-heading">
        <span>{hasRecognizedContent ? <Check size={16} /> : <ScanText size={16} />}</span>
        <div>
          <strong>{hasRecognizedContent ? `已识别 ${result.filledFields} 项回答` : "没有识别到问卷答案"}</strong>
          <p>{result.recognizedFields} 个问题标题被识别，并已转换成现有的人物画像输入格式。</p>
        </div>
      </div>
      {result.missingRequired.length > 0 ? (
        <div className="import-missing">
          <strong>还需要补充 {result.missingRequired.length} 个必填项</strong>
          <p>{result.missingRequired.slice(0, 8).map((item) => item.label).join("、")}{result.missingRequired.length > 8 ? "等" : ""}</p>
        </div>
      ) : (
        <p className="import-ready-text">必填内容完整，可以直接生成，也可以先逐项检查。</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  tall = false,
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  tall?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`form-field ${className}`}>
      <span>{label}{required && <b>*</b>}</span>
      {multiline ? (
        <textarea className={tall ? "is-tall" : ""} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}
