"use client";
/* eslint-disable @next/next/no-img-element -- The private browser tool renders local blob URLs that Next Image cannot optimize. */

import { Download, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

export type PlateBlurCopy = {
  uploadTitle: string; uploadDescription: string; choosePhoto: string; clientOnly: string; selectTitle: string; selectDescription: string; drawRectangle: string; firstCorner: string; oppositeCorner: string; reviewTitle: string; noRegions: string; oneRegion: string; manyRegions: string; process: string; processing: string; ready: string; download: string; privacy: string; invalidBox: string; unavailable: string;
};

async function blurOnMainThread(file: File, boxes: Box[]) {
  const image = new Image(); const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Unable to read image.")); image.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d"); if (!context || !("filter" in context)) throw new Error("This browser cannot blur the image locally.");
    context.drawImage(image, 0, 0);
    for (const box of boxes) {
      const marginX = box.width * .08, marginY = box.height * .08, x = Math.max(0, box.x - marginX) * canvas.width, y = Math.max(0, box.y - marginY) * canvas.height, width = Math.min(1, box.width + marginX * 2) * canvas.width, height = Math.min(1, box.height + marginY * 2) * canvas.height;
      context.save(); context.beginPath(); context.rect(x, y, width, height); context.clip(); context.filter = "blur(28px)"; context.drawImage(image, 0, 0); context.restore();
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to export image.")), "image/jpeg", .92));
  } finally { URL.revokeObjectURL(url); }
}

async function blurInBrowser(file: File, boxes: Box[]) {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return blurOnMainThread(file, boxes);
  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker("/workers/license-plate-blur.js");
    worker.onmessage = ({ data }: MessageEvent<{ blob?: Blob; error?: string }>) => { worker.terminate(); data.blob ? resolve(data.blob) : reject(new Error(data.error ?? "Unable to process image.")); };
    worker.onerror = () => { worker.terminate(); blurOnMainThread(file, boxes).then(resolve, reject); };
    worker.postMessage({ file, boxes });
  });
}

export function ManualPlateBlur({ copy }: { copy: PlateBlurCopy }) {
  const input = useRef<HTMLInputElement>(null), stage = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null), [sourceUrl, setSourceUrl] = useState<string | null>(null), [resultUrl, setResultUrl] = useState<string | null>(null), [boxes, setBoxes] = useState<Box[]>([]), [drawing, setDrawing] = useState(false), [start, setStart] = useState<Point | null>(null), [draftEnd, setDraftEnd] = useState<Point | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const point = (event: React.MouseEvent<HTMLDivElement>): Point | null => { const rect = stage.current?.getBoundingClientRect(); return rect ? { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) } : null; };
  const chooseFile = (next: File) => { if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(next.type) || next.size > 20_000_000) { setError(copy.unavailable); return; } if (sourceUrl) URL.revokeObjectURL(sourceUrl); if (resultUrl) URL.revokeObjectURL(resultUrl); setFile(next); setSourceUrl(URL.createObjectURL(next)); setResultUrl(null); setBoxes([]); setDrawing(false); setStart(null); setDraftEnd(null); setError(null); };
  const selectCorner = (event: React.MouseEvent<HTMLDivElement>) => { if (!drawing) return; const end = point(event); if (!end) return; if (!start) { setStart(end); setDraftEnd(end); setError(null); return; } const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y), width = Math.abs(start.x - end.x), height = Math.abs(start.y - end.y); if (width < .01 || height < .01) { setError(copy.invalidBox); return; } setBoxes((current) => [...current, { x, y, width, height }]); setDrawing(false); setStart(null); setDraftEnd(null); setError(null); };
  const process = async () => { if (!file || !boxes.length) return; setBusy(true); setError(null); try { const output = await blurInBrowser(file, boxes); if (resultUrl) URL.revokeObjectURL(resultUrl); setResultUrl(URL.createObjectURL(output)); } catch (reason) { setError(reason instanceof Error ? reason.message : copy.unavailable); } finally { setBusy(false); } };
  const preview = start && draftEnd ? { x: Math.min(start.x, draftEnd.x), y: Math.min(start.y, draftEnd.y), width: Math.abs(start.x - draftEnd.x), height: Math.abs(start.y - draftEnd.y) } : null;
  const boxStyle = (box: Box): React.CSSProperties => ({ position: "absolute", left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, border: "2px solid #ef7a3d", background: "#ef7a3d20", borderRadius: 4, pointerEvents: "none" });
  return <section className="free-tool" aria-label={copy.uploadTitle}><div className="free-tool-controls"><p className="eyebrow">FREE · IN YOUR BROWSER</p><h2>{copy.uploadTitle}</h2><p>{copy.uploadDescription}</p><button className="upload-zone" onClick={() => input.current?.click()} disabled={busy}><Upload/><b>{copy.choosePhoto}</b><span>{copy.clientOnly}</span></button><input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const next = event.target.files?.[0]; if (next) chooseFile(next); event.currentTarget.value = ""; }} />{sourceUrl && <><div className="free-tool-step"><h3>{copy.selectTitle}</h3><p>{copy.selectDescription}</p><button className="secondary-button" disabled={busy} onClick={() => { setDrawing(true); setStart(null); setDraftEnd(null); setError(null); }}><Plus size={15}/>{copy.drawRectangle}</button></div><div className="free-tool-step"><button className="primary-button" disabled={!boxes.length || busy} onClick={() => void process()}>{busy ? <><LoaderCircle className="spin" size={16}/>{copy.processing}</> : copy.process}</button></div></>}{error && <div className="error-state">{error}</div>}</div><div className="free-tool-workspace"><div className="free-tool-preview"><div className="split"><div><p className="eyebrow">PRIVATE IMAGE TOOL</p><h2>{drawing ? start ? copy.oppositeCorner : copy.firstCorner : copy.reviewTitle}</h2></div></div>{sourceUrl ? <div ref={stage} className={`basic-edit-stage ${drawing ? "is-drawing" : ""}`} onClick={selectCorner} onPointerMove={(event) => { if (drawing && start) { const end = point(event); if (end) setDraftEnd(end); } }}><img src={sourceUrl} alt="Selected vehicle" />{boxes.map((box, index) => <i key={`${box.x}-${box.y}-${index}`} style={boxStyle(box)} />)}{preview && <i style={boxStyle(preview)} />}{drawing && start && <i className="basic-edit-anchor" style={{ left: `${start.x * 100}%`, top: `${start.y * 100}%` }} />}</div> : <div className="basic-edit-empty"><Upload size={28}/><b>{copy.choosePhoto}</b><span>{copy.privacy}</span></div>}</div>{sourceUrl && <div className="free-tool-boxes"><p>{boxes.length ? `${boxes.length} ${boxes.length === 1 ? copy.oneRegion : copy.manyRegions}` : copy.noRegions}</p>{boxes.map((box, index) => <div key={`${box.x}-${box.y}-${index}`} className="basic-box-row"><span>#{index + 1}</span><small>{Math.round(box.width * 100)}% × {Math.round(box.height * 100)}%</small><button aria-label={`Remove region ${index + 1}`} onClick={() => setBoxes((current) => current.filter((_, position) => position !== index))}><Trash2 size={15}/></button></div>)}</div>}{resultUrl && <div className="free-tool-result"><p className="eyebrow">{copy.ready}</p><img src={resultUrl} alt="Vehicle with blurred license plate" /><a className="primary-button" href={resultUrl} download="vehicle-license-plate-blurred.jpg"><Download size={16}/>{copy.download}</a></div>}</div></section>;
}
