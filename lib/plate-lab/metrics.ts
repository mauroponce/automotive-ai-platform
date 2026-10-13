import type { NormalizedBox } from "./models";

export function intersectionOverUnion(a: NormalizedBox, b: NormalizedBox) {
  const left = Math.max(a.x, b.x); const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width); const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function scoreDetections(predictions: NormalizedBox[], groundTruth: NormalizedBox[], minimumIou = 0.5) {
  const matchedTruth = new Set<number>(); let truePositives = 0;
  for (const prediction of predictions) {
    let match = -1; let best = minimumIou;
    groundTruth.forEach((truth, index) => { if (!matchedTruth.has(index)) { const iou = intersectionOverUnion(prediction, truth); if (iou >= best) { best = iou; match = index; } } });
    if (match >= 0) { matchedTruth.add(match); truePositives++; }
  }
  const falsePositives = predictions.length - truePositives;
  const falseNegatives = groundTruth.length - truePositives;
  const precision = truePositives + falsePositives === 0 ? null : truePositives / (truePositives + falsePositives);
  const recall = truePositives + falseNegatives === 0 ? null : truePositives / (truePositives + falseNegatives);
  const f1 = precision === null || recall === null || precision + recall === 0 ? null : 2 * precision * recall / (precision + recall);
  return { truePositives, falsePositives, falseNegatives, precision, recall, f1 };
}
