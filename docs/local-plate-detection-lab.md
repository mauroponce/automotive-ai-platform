# Local plate detection laboratory

The Super Admin laboratory is available at `/lab/plate-detection`. It benchmarks local CPU plate detectors and the OpenCV baseline against uploaded, authorized images. It never sends images to OpenAI or another hosted vision service.

## Start and install evaluation models

```bash
cp .env.example .env.local
docker compose up --build
docker compose --profile tools run --rm plate-model-bootstrap
```

`models.lock.json` pins the reviewed evaluation-artifact SHA-256 values. The bootstrap command refuses mismatches and detector requests never download weights.

The current YOLOv9 files are evaluation-only and must not be selected for production work. Their code repository is MIT, but the weights/training-data provenance has not been established for commercial deployment.

## Workflow

1. Sign in as the persisted super admin and open `/lab/plate-detection`.
2. Upload up to 30 JPEG, PNG, or WebP files, each at most 20 MB and 24 MP.
3. Select local detectors, set a score threshold, and run the batch.
4. Inspect model overlays. “No detections” means unverified, not “no plate.”
5. Select a completed model and apply deterministic blur. Outputs without detections remain visually unchanged.

Detection boxes are normalized against an EXIF-oriented source. Sharp applies blur, pixelation, or an opaque cover only inside detected boxes plus the selected safety margin. The laboratory does not read plate characters.

Manual annotations are reserved for ground truth and later recall/precision measurements. They must never be treated as automatic blur detections.
