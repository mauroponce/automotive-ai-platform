self.onmessage = async ({ data }) => {
  try {
    const bitmap = await createImageBitmap(data.file, { imageOrientation: "from-image" });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    for (const box of data.boxes) {
      const marginX = box.width * 0.08;
      const marginY = box.height * 0.08;
      const x = Math.max(0, box.x - marginX) * bitmap.width;
      const y = Math.max(0, box.y - marginY) * bitmap.height;
      const width = Math.min(1, box.width + marginX * 2) * bitmap.width;
      const height = Math.min(1, box.height + marginY * 2) * bitmap.height;
      context.save();
      context.beginPath();
      context.rect(x, y, width, height);
      context.clip();
      context.filter = "blur(28px)";
      context.drawImage(bitmap, 0, 0);
      context.restore();
    }
    bitmap.close();
    self.postMessage({ blob: await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 }) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Unable to process image." });
  }
};
