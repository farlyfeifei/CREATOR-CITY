import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "未收到文件" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "文件不能超过 8 MB" }, { status: 413 });

    const name = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    let extracted = "";

    if (/\.(txt|md|json|csv)$/.test(name)) {
      extracted = new TextDecoder("utf-8").decode(bytes);
    } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { extractText } = await import("unpdf");
      const result = await extractText(new Uint8Array(bytes));
      extracted = result.text.join("\n");
    } else if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      extracted = result.value;
    } else {
      return NextResponse.json({ ok: false, error: "仅支持 PDF、DOCX、TXT、Markdown；旧版 DOC 请先转为 DOCX" }, { status: 415 });
    }

    const clean = extracted.replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 50000);
    if (!clean) return NextResponse.json({ ok: false, error: "没有提取到可读文字，请粘贴简历关键内容" }, { status: 422 });
    return NextResponse.json({ ok: true, data: { text: clean, fileName: file.name, characters: clean.length } });
  } catch (error) {
    console.error("Profile document extraction failed", error);
    return NextResponse.json({ ok: false, error: "文件解析失败，请改用文本粘贴" }, { status: 500 });
  }
}
