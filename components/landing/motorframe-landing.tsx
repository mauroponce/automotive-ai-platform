"use client";

import { Download, Image as ImageIcon, Menu, Minus, Move, Plus, ShieldCheck, Upload, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { detectLicensePlatesInBrowser } from "@/lib/browser-plate-detector";

type Region = { id: string; x: number; y: number; width: number; height: number; angle?: number };
type Photo = { id: string; file: File; url: string; width: number; height: number; regions: Region[] };
type View = { scale: number; x: number; y: number };
const images = ["suv-plata.webp", "sedan-grafito.webp", "crossover-azul.webp", "hatch-verde.webp", "pickup-blanca.webp"];
const asset = (name: string) => `/motorframe/${name}`;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

async function dimensions(url: string) { const image = new Image(); image.src = url; await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight }; }
async function blur(photo: Photo) {
  const image = new Image();
  image.src = photo.url;
  await image.decode();

  const resize = Math.min(1, 2800 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * resize);
  canvas.height = Math.round(image.naturalHeight * resize);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process this image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blurredCanvas = document.createElement("canvas");
  blurredCanvas.width = canvas.width;
  blurredCanvas.height = canvas.height;
  const blurredContext = blurredCanvas.getContext("2d");
  if (!blurredContext) throw new Error("Your browser could not process this image.");

  photo.regions.forEach((region) => {
    const paddingX = region.width * .08;
    const paddingY = region.height * .12;
    const x = Math.max(0, region.x - paddingX) * canvas.width;
    const y = Math.max(0, region.y - paddingY) * canvas.height;
    const width = Math.min(1 - Math.max(0, region.x - paddingX), region.width + paddingX * 2) * canvas.width;
    const height = Math.min(1 - Math.max(0, region.y - paddingY), region.height + paddingY * 2) * canvas.height;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const blurRadius = clamp(Math.round(Math.min(width, height) * .28), 8, 28);

    // Blur the original image in a separate buffer, then blend that actual image data
    // back through the rotated selection. This avoids an opaque grey overlay.
    blurredContext.clearRect(0, 0, blurredCanvas.width, blurredCanvas.height);
    blurredContext.filter = `blur(${blurRadius}px)`;
    blurredContext.drawImage(image, 0, 0, blurredCanvas.width, blurredCanvas.height);
    blurredContext.filter = "none";

    context.save();
    context.translate(centerX, centerY);
    context.rotate((region.angle ?? 0) * Math.PI / 180);
    context.beginPath();
    context.rect(-width / 2, -height / 2, width, height);
    context.clip();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.drawImage(blurredCanvas, 0, 0);
    context.restore();
  });

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Unable to export.")), "image/jpeg", .92));
  return URL.createObjectURL(blob);
}

export function Hero3DCarousel() { const [active, setActive] = useState(0); useEffect(() => { const timer = window.setInterval(() => setActive((i) => (i + 1) % images.length), 4300); return () => clearInterval(timer); }, []); return <div className="mf-carousel"><button onClick={() => setActive((active + images.length - 1) % images.length)} aria-label="Previous example">‹</button><div>{[-1, 0, 1].map((offset) => <img key={offset} className={`card-${offset}`} src={asset(images[(active + offset + images.length) % images.length])} alt="Illustrative vehicle photography"/>)}</div><button onClick={() => setActive((active + 1) % images.length)} aria-label="Next example">›</button><p>{images.map((_, i) => <button key={i} className={active === i ? "active" : ""} onClick={() => setActive(i)} aria-label={`Example ${i + 1}`}/>)}</p></div>; }

export function ImageViewport({ photo, update }: { photo: Photo; update: (regions: Region[]) => void }) {
  const host = useRef<HTMLDivElement>(null); const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 }), [mode, setMode] = useState<"mark" | "pan">("mark"), [draft, setDraft] = useState<Region | null>(null), [drag, setDrag] = useState<{ x: number; y: number; view: View } | null>(null), [selected, setSelected] = useState<string | null>(null), [edit, setEdit] = useState<{ region: Region; kind: "move" | "rotate" | "nw" | "ne" | "sw" | "se"; start: { x: number; y: number } } | null>(null);
  const fit = () => { const node = host.current; if (!node) return; const scale = Math.min((node.clientWidth - 32) / photo.width, (node.clientHeight - 32) / photo.height); setView({ scale, x: (node.clientWidth - photo.width * scale) / 2, y: (node.clientHeight - photo.height * scale) / 2 }); };
  useEffect(() => { requestAnimationFrame(fit); setSelected(photo.regions[0]?.id ?? null); }, [photo.id]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === " ") setMode("pan"); if ((event.key === "Delete" || event.key === "Backspace") && selected) update(photo.regions.filter((region) => region.id !== selected)); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [photo.regions, selected, update]);
  const point = (event: React.PointerEvent) => { const rect = host.current!.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left - view.x) / (photo.width * view.scale), 0, 1), y: clamp((event.clientY - rect.top - view.y) / (photo.height * view.scale), 0, 1) }; };
  const down = (event: React.PointerEvent) => { event.currentTarget.setPointerCapture(event.pointerId); if (mode === "pan" || event.shiftKey) setDrag({ x: event.clientX, y: event.clientY, view }); else { const p = point(event); setDraft({ id: "draft", x: p.x, y: p.y, width: 0, height: 0 }); } };
  const move = (event: React.PointerEvent) => { if (edit) { const p = point(event), original = edit.region, right = original.x + original.width, bottom = original.y + original.height; let next: Region = original; if (edit.kind === "move") next = { ...original, x: clamp(original.x + p.x - edit.start.x, 0, 1 - original.width), y: clamp(original.y + p.y - edit.start.y, 0, 1 - original.height) }; else if (edit.kind === "rotate") { const angle = Math.atan2(p.y - (original.y + original.height / 2), p.x - (original.x + original.width / 2)) * 180 / Math.PI + 90; next = { ...original, angle: Math.round(angle) }; } else { const x = edit.kind.includes("w") ? p.x : original.x, y = edit.kind.includes("n") ? p.y : original.y, width = edit.kind.includes("w") ? right - p.x : p.x - original.x, height = edit.kind.includes("n") ? bottom - p.y : p.y - original.y; next = { ...original, x: clamp(x, 0, .99), y: clamp(y, 0, .99), width: Math.max(.01, width), height: Math.max(.01, height) }; } update(photo.regions.map((region) => region.id === original.id ? next : region)); return; } if (drag) setView({ ...drag.view, x: drag.view.x + event.clientX - drag.x, y: drag.view.y + event.clientY - drag.y }); if (draft) { const p = point(event); setDraft({ ...draft, x: Math.min(draft.x, p.x), y: Math.min(draft.y, p.y), width: Math.abs(draft.x - p.x), height: Math.abs(draft.y - p.y) }); } };
  const end = () => { if (draft && draft.width > .008 && draft.height > .008) update([...photo.regions, { ...draft, id: crypto.randomUUID() }]); setDraft(null); setDrag(null); setEdit(null); };
  const wheel = (event: React.WheelEvent) => { event.preventDefault(); const rect = host.current!.getBoundingClientRect(), scale = clamp(view.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), .08, 4), x = event.clientX - rect.left, y = event.clientY - rect.top; setView({ scale, x: x - (x - view.x) * scale / view.scale, y: y - (y - view.y) * scale / view.scale }); };
  const regions = draft ? [...photo.regions, draft] : photo.regions; const beginEdit = (event: React.PointerEvent, region: Region, kind: NonNullable<typeof edit>["kind"]) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelected(region.id); setEdit({ region, kind, start: point(event) }); };
  return <><div className="mf-editor-tools"><div><button className={mode === "mark" ? "active" : ""} onClick={() => setMode("mark")}><ImageIcon size={15}/> Mark</button><button className={mode === "pan" ? "active" : ""} onClick={() => setMode("pan")}><Move size={15}/> Pan</button></div><span>{selected ? "Drag inside to move · handles resize and rotate" : `${photo.regions.length} marked region${photo.regions.length === 1 ? "" : "s"}`}</span><div><button onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale / 1.2, .08, 4) }))}><Minus size={16}/></button><button onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale * 1.2, .08, 4) }))}><Plus size={16}/></button><button onClick={fit}>Fit</button><button onClick={() => setView({ scale: 1, x: 20, y: 20 })}>1:1</button></div></div><div ref={host} className={`mf-viewport ${mode}`} onPointerDown={down} onPointerMove={move} onPointerUp={end} onWheel={wheel}><div className="mf-canvas" style={{ width: photo.width, height: photo.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}><img src={photo.url} alt={`Selected vehicle ${photo.file.name}`} draggable={false}/>{regions.map((region) => <span key={region.id} className="mf-region-wrap" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`, transform: `rotate(${region.angle ?? 0}deg)` }}><button className={`mf-region ${selected === region.id ? "selected" : ""}`} onPointerDown={(event) => beginEdit(event, region, "move")} aria-label="Move license plate region"/>{selected === region.id && <><button className="mf-rotation-handle" onPointerDown={(event) => beginEdit(event, region, "rotate")} aria-label="Rotate selection">↻</button>{(["nw", "ne", "sw", "se"] as const).map((corner) => <button key={corner} className={`mf-resize-handle ${corner}`} onPointerDown={(event) => beginEdit(event, region, corner)} aria-label={`Resize selection from ${corner}`}/>)}</>}</span>)}</div><span>Scroll to zoom · drag to {mode}</span></div></>;
}

export function PlateEditor({ photos, active, setActive, setPhotos, complete }: { photos: Photo[]; active: number; setActive: (number: number) => void; setPhotos: (photos: Photo[]) => void; complete: () => void }) { const photo = photos[active]; const update = (regions: Region[]) => setPhotos(photos.map((item, index) => index === active ? { ...item, regions } : item)); return <div className="mf-editor"><aside><span className="mf-overline">TOOLS</span><h3>Mark license plates</h3><p>Zoom in and draw one rectangle over every visible plate.</p><p className="mf-shortcuts">Manual marking only.<br/>Automatic plate detection is not enabled.<br/><br/>Space: pan image<br/>Delete: remove selected region</p><button className="mf-text-button" onClick={() => update([])} disabled={!photo.regions.length}>Clear all marks</button></aside><div className="mf-editor-main"><ImageViewport photo={photo} update={update}/><div className="mf-filmstrip">{photos.map((item, index) => <button key={item.id} className={active === index ? "active" : ""} onClick={() => setActive(index)}><img src={item.url} alt={`Photo ${index + 1}`}/><small>{item.regions.length ? `${item.regions.length} marked` : `Photo ${index + 1}`}</small></button>)}</div><footer><span>{photos.reduce((total, item) => total + item.regions.length, 0)} plate regions marked</span><div><button className="mf-outline" onClick={() => setActive(Math.max(0, active - 1))}>Previous</button><button className="mf-outline" onClick={() => setActive(Math.min(photos.length - 1, active + 1))}>Next</button><button className="mf-button" disabled={!photos.some((item) => item.regions.length)} onClick={complete}>Review and download</button></div></footer></div></div>; }
export function PlateReviewGallery({ photos, results, active, setActive }: { photos: Photo[]; results: string[]; active: number; setActive: (number: number) => void }) { return <div className="mf-review"><span className="mf-overline">STEP 03 / 03</span><h3>Your photos are ready to review</h3><p>Check every visible license plate before publishing. Blur applies only to marked regions.</p><img src={results[active]} alt="Blurred vehicle result"/><div>{results.map((result, index) => <button className={active === index ? "active" : ""} key={result} onClick={() => setActive(index)}><img src={result} alt={`Result ${index + 1}`}/></button>)}</div><a className="mf-button" href={results[active]} download={`${photos[active].file.name.replace(/\.[^.]+$/, "")}-blurred.jpg`}><Download size={16}/> Download this image</a><small>Processed locally. Blur does not guarantee irreversible anonymization.</small></div>; }
export function ReviewResult() { return null; }

export function PlateWizard() {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]), [step, setStep] = useState(1), [results, setResults] = useState<string[]>([]), [working, setWorking] = useState(false), [error, setError] = useState("");
  const add = async (files: FileList | File[]) => {
    const file = Array.from(files).find((item) => ["image/jpeg", "image/png", "image/webp"].includes(item.type) && item.size <= 20 * 1024 * 1024);
    if (!file) return setError("Choose one JPG, PNG, or WebP image up to 20 MB.");
    setWorking(true); setError(""); const url = URL.createObjectURL(file), image = new Image(); image.src = url;
    try { await image.decode(); let regions: Region[] = []; try { regions = (await detectLicensePlatesInBrowser(image)).map((box) => ({ id: crypto.randomUUID(), x: box.x, y: box.y, width: box.width, height: box.height })); } catch { setError("Automatic detection could not start on this browser. You can still mark the plate manually."); }
      setPhotos([{ id: crypto.randomUUID(), file, url, width: image.naturalWidth, height: image.naturalHeight, regions }]); setStep(2);
    } finally { setWorking(false); }
  };
  const complete = async () => { setWorking(true); try { setResults(await Promise.all(photos.map(blur))); setStep(3); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to process the image."); } finally { setWorking(false); } };
  return <section id="blur" className="mf-blur-section"><div className="mf-section-head"><div><span className="mf-overline">BASIC EDITING · INTERACTIVE EDITOR</span><h2>The license plate, <em>blurred.</em><br/>The vehicle, unchanged.</h2></div><p>Upload one photo and the plate suggestion is found locally in your browser. Review and correct it before blurring.</p></div><div className="mf-wizard"><header><div><strong>Motorframe plate editor</strong><small>On-device browser detection</small></div><span><ShieldCheck size={14}/> 100% private</span></header><div className="mf-steps">{["Upload photo", "Review plate", "Download"].map((label, index) => <span key={label} className={step >= index + 1 ? "active" : ""}>0{index + 1} {label}</span>)}</div>{step === 1 && <div className="mf-upload"><div><span className="mf-overline">STEP 01 / 03</span><h3>Choose your vehicle photo.</h3><p>We find the plate directly on your device, without uploading the image.</p><div className="mf-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void add(event.dataTransfer.files); }}><Upload/><strong>Drop one vehicle photo here</strong><small>JPG, PNG, or WebP · up to 20 MB</small><button className="mf-button" onClick={() => input.current?.click()}>Choose photo</button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { if (event.target.files) void add(event.target.files); event.currentTarget.value = ""; }}/></div>{error && <p className="mf-error">{error}</p>}</div><aside><span className="mf-overline">PRIVATE LOCAL TOOL</span><p>Your photo will open directly in the editor after detection.</p></aside></div>}{step === 2 && <PlateEditor photos={photos} active={0} setActive={() => undefined} setPhotos={setPhotos} complete={() => void complete()}/>} {step === 3 && <PlateReviewGallery photos={photos} results={results} active={0} setActive={() => undefined}/>} {working && <div className="mf-processing">Detecting the plate on your device…</div>}</div></section>;
}

export function AdvancedSection() { const [background, setBackground] = useState("fondo-premium.webp"); return <section id="advanced" className="mf-advanced"><div className="mf-advanced-visual" style={{ backgroundImage: `url(${asset(background)})` }}><img src={asset("suv-plata.webp")} alt="Illustrative vehicle over an example background"/><span>Illustrative concept · not a processed result</span></div><div><span className="mf-overline">ADVANCED EDITING · IN DEVELOPMENT</span><h2>From a photo to a <em>professional presentation.</em></h2><p>We are evaluating conservative background and lighting workflows for dealerships. Results require review and are not simulated here.</p><div className="mf-backgrounds">{["fondo-premium.webp", "fondo-claro.webp", "fondo-showroom-calido.webp"].map((name) => <button key={name} className={background === name ? "active" : ""} onClick={() => setBackground(name)} style={{ backgroundImage: `url(${asset(name)})` }} aria-label="Select illustrative background"/>)}</div></div></section>; }

export function MotorframeLanding() { const [menu, setMenu] = useState(false); return <main className="mf-page"><nav className="mf-nav"><a className="mf-brand" href="#top"><b>⌁</b> motorframe</a><button className="mf-menu" onClick={() => setMenu(!menu)} aria-label="Open navigation"><Menu size={20}/></button><div className={menu ? "open" : ""}><a href="#blur">Blur plates</a><a href="#advanced">Advanced editing</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div><a className="mf-login" href="/login">Sign in</a><a className="mf-button mf-small" href="#blur">Try for free</a></nav><section id="top" className="mf-hero"><span className="mf-overline">AUTOMOTIVE PHOTOGRAPHY, SIMPLIFIED</span><h1>Your vehicles deserve<br/><em>studio-quality photos.</em></h1><p>From a blurred license plate to a professional showroom proposal. One simple workflow for your inventory.</p><div><a className="mf-button" href="#blur">Blur a license plate ↗</a><a className="mf-outline" href="#advanced">Explore advanced editing</a></div><Hero3DCarousel/></section><div className="mf-proof"><span>Made for dealerships</span><span>Works on desktop and mobile</span><span>Privacy-first local editing</span></div><section className="mf-features"><header><span className="mf-overline">A CLEARER WAY TO PUBLISH</span><h2>A photo studio in your browser.</h2><p>Choose what you need without complex tools or hidden processing.</p></header><div>{[["Fast to use", "A focused flow from upload to review."], ["Your photo stays local", "The plate editor does not upload your image."], ["Built for vehicle inventory", "Review several vehicle photos together."]].map(([title, text]) => <article key={title}><ZoomIn/><h3>{title}</h3><p>{text}</p></article>)}</div></section><PlateWizard/><AdvancedSection/><section id="pricing" className="mf-pricing"><header><span className="mf-overline">CREDIT MODEL</span><h2>Pay for the photos you need.</h2><p>Prepaid credits and indicative values are hypotheses under validation, not published prices.</p></header><div><article><h3>Basic editing</h3><p>Manual license plate privacy controls and deterministic adjustments.</p><strong>Under validation</strong></article><article className="popular"><h3>Advanced editing</h3><p>Premium background and presentation workflows remain under evaluation.</p><strong>Under validation</strong></article></div></section><section id="faq" className="mf-faq"><span className="mf-overline">FAQ</span><h2>What you need to know.</h2><details open><summary>Does this page automatically detect license plates?</summary><p>No. The editor deliberately uses manual marks. Automatic local detection remains under evaluation.</p></details><details><summary>Are images uploaded to your servers?</summary><p>No. The landing editor processes selected images only in the browser.</p></details><details><summary>Does blur guarantee full anonymization?</summary><p>No. Review every visible plate before publishing.</p></details></section><footer><div className="mf-brand"><b>⌁</b> motorframe</div><p>Automotive photography for dealerships. Product in development.</p></footer></main>; }
