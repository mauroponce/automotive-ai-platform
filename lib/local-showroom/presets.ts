import path from "node:path";

export const showroomPresets = [
  { id: "studio-white", label: "White studio", filename: "studio-white-v1.png", supportY: .82, centerX: .5, maxWidth: .7, shadowIntensity: .24 },
  { id: "showroom-gray", label: "Light gray showroom", filename: "showroom-gray-v1.png", supportY: .79, centerX: .5, maxWidth: .72, shadowIntensity: .28 },
  { id: "showroom-dark", label: "Dark showroom", filename: "showroom-dark-v1.png", supportY: .8, centerX: .5, maxWidth: .7, shadowIntensity: .32 },
] as const;

export function getShowroomPreset(id: string) { const preset = showroomPresets.find((item) => item.id === id); if (!preset) throw new Error("Unknown showroom preset."); return preset; }
export function presetPath(id: string) { return path.join(process.cwd(), "public", "showrooms", getShowroomPreset(id).filename); }
