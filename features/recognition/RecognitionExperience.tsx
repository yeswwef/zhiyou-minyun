/**
 * @module-note features/recognition/RecognitionExperience.tsx
 * AI 多模态识景展示层：上传照片、压缩预览、调用识景接口并展示带来源的讲解。
 */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertCircle, ArrowLeft, BookOpen, ChevronDown, FileText, Globe2, ImagePlus, Landmark,
  LoaderCircle, RotateCcw, ScanLine, Sparkles, Upload, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { AnswerContent } from "@/features/ai-chat/AnswerContent";
import type { RecognitionResponse, RecognitionResult } from "./types";
import s from "./recognition.module.css";

const STATUS = ["正在识别画面…", "正在检索本地知识库…", "正在整理历史与非遗讲解…"];
const MAX_FILE_BYTES = 12 * 1024 * 1024;

/** 在浏览器端把照片缩放到 1280px 内并转为 JPEG，减少上传体积与识别耗时。 */
async function prepareImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("仅支持 JPG、PNG、WebP 图片");
  if (file.size > MAX_FILE_BYTES) throw new Error("原图不能超过 12MB");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理这张图片");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * 管理识景页面的图片选择、请求状态、识别结果和来源展开。
 */
export function RecognitionExperience() {
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState("");
  const [activeSource, setActiveSource] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setStatusIndex((index) => Math.min(index + 1, STATUS.length - 1)), 5000);
    return () => window.clearInterval(timer);
  }, [busy]);

  /** 读取文件并生成预览；失败信息直接展示给用户。 */
  async function choose(file: File) {
    if (busy) return;
    try {
      setError("");
      const dataUrl = await prepareImage(file);
      setImage(dataUrl);
      setFileName(file.name);
      setResult(null);
      setActiveSource("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取这张图片");
    }
  }

  /** 把照片发送到服务端识别，并保存识别与讲解结果。 */
  async function analyze() {
    if (!image || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setStatusIndex(0); setError(""); setResult(null); setActiveSource("");
    try {
      const response = await fetch("/api/recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
        signal: AbortSignal.timeout(180000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "识别失败，请稍后重试");
      setResult((data as RecognitionResponse).result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "识别失败，请稍后重试");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  /** 清空当前照片与结果，回到初始上传状态。 */
  function reset() {
    if (busy) return;
    setImage(""); setFileName(""); setResult(null); setError(""); setActiveSource("");
    if (input.current) input.current.value = "";
  }

  /** 处理拖拽上传，只取第一张图片。 */
  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void choose(file);
  }

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href="/home" className={s.brand} aria-label="智游闽韵首页">
          <span className={s.brandIcon}><BrandMark size={27} /></span>
          <span><strong>智游闽韵</strong><small>FUZHOU TRAVEL</small></span>
        </Link>
        <nav aria-label="主导航">
          <Link href="/home">发现</Link>
          <Link href="/ask">AI文化问答</Link>
          <Link href="/resources">文旅资源</Link>
          <Link href="/community">社区</Link>
          <Link href="/shop">商城</Link>
        </nav>
        <Link href="/home" className={s.back}><ArrowLeft size={16} />返回首页</Link>
      </header>

      <main className={s.main}>
        <section className={s.hero}>
          <p className={s.kicker}>AI VISION · 多模态识景</p>
          <h1>拍一张照片，<em>读懂福州</em></h1>
          <p className={s.lead}>上传福州任意景点照片，系统自动识别对象，并给出历史背景、非遗知识点与可查来源。</p>
          <div className={s.tags}><span>福州景点</span><span>自然景观</span></div>
        </section>

        <div className={s.workspace}>
          <section className={s.uploadCard} aria-label="上传照片">
            <div className={s.cardHead}>
              <span><Upload size={17} />上传照片</span>
              <small>JPG / PNG / WebP · 原图最大 12MB</small>
            </div>

            {image ? (
              <div className={s.previewWrap}>
                <img src={image} alt="待识别照片预览" className={s.preview} />
                <button className={s.remove} onClick={reset} aria-label="移除照片" disabled={busy}><X size={16} /></button>
                <div className={s.previewMeta}>
                  <span title={fileName}>{fileName}</span>
                  <button onClick={() => input.current?.click()} disabled={busy}>更换照片</button>
                </div>
              </div>
            ) : (
              <label className={s.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={drop}>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
                  onChange={(event) => { const file = event.target.files?.[0]; if (file) void choose(file); }} />
                <span className={s.dropIcon}><ImagePlus size={30} /></span>
                <strong>拖拽照片到这里，或点击选择</strong>
                <small>建议主体居中、光线充足；上传前会自动压缩</small>
              </label>
            )}

            <button className={s.analyze} onClick={analyze} disabled={!image || busy}>
              {busy
                ? <><LoaderCircle className={s.spinner} size={18} />{STATUS[statusIndex]}</>
                : <><ScanLine size={18} />开始识别</>}
            </button>
            {error && <p className={s.error} role="alert"><AlertCircle size={15} />{error}</p>}
            <p className={s.note}>照片只用于本次识别请求，不会写入知识库，也不会上传到公开地址。</p>
          </section>

          <section className={s.resultCard} aria-live="polite">
            {busy && (
              <div className={s.loading}>
                <span className={s.loadingIcon}><ScanLine size={28} /></span>
                <h2>{STATUS[statusIndex]}</h2>
                <p>识别对象、检索本地资料并生成讲解，通常需要十几秒。</p>
                <div className={s.loadingBar}><i /></div>
              </div>
            )}

            {!busy && !result && (
              <div className={s.empty}>
                <span className={s.emptyIcon}><ScanLine size={30} /></span>
                <p className={s.kicker}>HOW IT WORKS</p>
                <h2>从一张福州景点照片开始</h2>
                <ol>
                  <li><b>01</b>上传清晰照片</li>
                  <li><b>02</b>识别照片中的福州景点</li>
                  <li><b>03</b>查看历史背景、非遗知识点与来源</li>
                </ol>
              </div>
            )}

            {!busy && result && (
              <div className={s.resultBody}>
                <div className={s.resultHead}>
                  <div>
                    <p className={s.kicker}>识别结果</p>
                    <h2>{result.object}</h2>
                    <div className={s.badges}>
                      <span className={s.category}>{result.category}</span>
                      <span className={s.confidence}>置信度 {(result.confidence * 100).toFixed(0)}%</span>
                      <span className={!result.inFuzhou ? s.warnBadge : result.grounded ? s.grounded : result.web ? s.webBadge : s.warnBadge}>
                        {!result.inFuzhou ? "非福州景点" : result.grounded ? "本地资料支撑" : result.web ? "联网补充" : "模型知识"}
                      </span>
                      {result.uncertain && <span className={s.warnBadge}>不确定</span>}
                    </div>
                  </div>
                  <button className={s.again} onClick={reset}><RotateCcw size={15} />重新识别</button>
                </div>

                {result.evidence && <p className={s.evidence}><ScanLine size={15} /><span>{result.evidence}</span></p>}
                {!result.inFuzhou ? (
                  <p className={s.ungrounded}><BookOpen size={15} /><span>这张照片看起来不是福州范围内的景点，本模块目前只识别福州本地景点。</span></p>
                ) : !result.grounded ? (
                  <p className={s.ungrounded}><BookOpen size={15} /><span>{result.web
                    ? "该福州景点未收录于本地知识库，讲解由模型通用知识与联网检索补充，请以官方资料为准。"
                    : "该福州景点未收录于本地知识库，以下讲解来自模型通用知识，未附本地来源，请以官方资料为准。"}</span></p>
                ) : null}
                <p className={s.summary}>{result.summary}</p>

                {result.inFuzhou && (
                  <section className={s.block}>
                    <h3><Landmark size={17} />历史背景</h3>
                    <p>{result.history}</p>
                  </section>
                )}

                {result.inFuzhou && result.heritage && (
                  <section className={s.block}>
                    <h3><Sparkles size={17} />相关非遗知识点{result.heritageFromWeb ? "（联网补充）" : ""}</h3>
                    <p>{result.heritage}</p>
                  </section>
                )}

                {result.inFuzhou && result.web && (result.web.text || result.web.sources.length > 0) && (
                  <section className={s.webBlock}>
                    <h3><Globe2 size={17} />联网补充<small>{result.web.sources.length} 个网页来源</small></h3>
                    {result.web.text && <AnswerContent className={s.webText} text={result.web.text} />}
                    {result.web.sources.length > 0 && (
                      <div className={s.webSources}>
                        {result.web.sources.map((source) => (
                          <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                            <span>[{source.id}] {source.title}</span>
                            <small>{new URL(source.url).hostname}</small>
                          </a>
                        ))}
                      </div>
                    )}
                    <p className={s.sourceNote}>来源由联网搜索返回，网页内容可能变化；链接对应关系未逐页核验。</p>
                  </section>
                )}

                {result.inFuzhou && (
                <section className={s.sources}>
                  <h3><FileText size={17} />来源<small>{result.sources.length} 条本地资料</small></h3>
                  {result.sources.length ? result.sources.map((source) => (
                    <article key={source.id} className={`${s.sourceCard} ${activeSource === source.id ? s.sourceActive : ""}`}>
                      <button aria-expanded={activeSource === source.id}
                        onClick={() => setActiveSource(activeSource === source.id ? "" : source.id)}>
                        <span className={s.sourceIndex}>[{source.id}]</span>
                        <span className={s.sourceText}>
                          <b>{source.title}</b>
                          <small>{source.file} · L{source.lineStart}–{source.lineEnd}</small>
                        </span>
                        <ChevronDown size={15} className={activeSource === source.id ? s.chevronOpen : ""} />
                      </button>
                      {activeSource === source.id && <blockquote>{source.quote}</blockquote>}
                    </article>
                  )) : (
                    <p className={s.noSource}><BookOpen size={16} />{result.web
                      ? "本地知识库没有可引用片段，请查看上方联网来源。"
                      : "该福州景点未收录于本地知识库，本次讲解未附本地来源。"}</p>
                  )}
                  {result.sources.length > 0 && (
                    <p className={s.sourceNote}>来源为项目内置福州文旅知识库 TXT 的片段与行号，不代表外部官网已核验。</p>
                  )}
                </section>
                )}

                <details className={s.trace}>
                  <summary>识别说明</summary>
                  {result.trace.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                  <p>总耗时 {(result.trace.elapsedMs / 1000).toFixed(1)} 秒 · 语义向量检索{result.trace.dense ? "已启用" : "已降级为关键词"}</p>
                </details>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
