# Local Basic V1: plate blur

Basic V1 processes one vehicle image at a time. It does not invoke OpenAI, use S3, create a batch, replace a background, or alter the vehicle beyond the confirmed license-plate regions.

## Run locally

```bash
cp .env.example .env.local
docker compose --profile tools run --rm plate-model-bootstrap
docker compose up --build
```

Open `http://localhost:3000`, sign in, and choose **Blur license plate**. Upload one JPG, PNG, or WebP image (20 MB maximum), review the suggested rectangles, remove any incorrect suggestion, and draw a rectangle over every visible plate. Then choose **Blur confirmed plates** and download the JPEG.

The detector runs inside the local `plate-detector` container. Its current model is evaluation-only, so a missing or incorrect rectangle must always be corrected manually before the blur is applied. If the detector is unavailable, manual rectangles still allow the complete workflow to finish.

## Local storage and privacy

The application normalizes each source image to JPEG, then stores the source, output, and owner metadata under `data/basic-edit/` by default. The directory is ignored by Git. Files are served only through authenticated server routes that verify the owner of the edit record; local filesystem paths are never sent to the browser.

Set `BASIC_EDIT_STORAGE_ROOT` to change the local directory. This is intentionally a local-only storage adapter. Production object storage and retention rules will be introduced with the Advanced workflow; do not point this setting to a public web directory.
