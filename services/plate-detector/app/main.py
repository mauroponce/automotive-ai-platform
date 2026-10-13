import json
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

MODEL_ROOT = Path(os.environ.get("PLATE_MODEL_ROOT", "/models"))
TOKEN = os.environ.get("PLATE_DETECTOR_SHARED_TOKEN", "")
LOCK = json.loads((Path(__file__).parent.parent / "models.lock.json").read_text())
SPECS = {entry["id"]: entry for entry in LOCK["models"]}

class Box(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)
class Detection(BaseModel):
    box: Box
    confidence: float = Field(ge=0, le=1)
    modelId: str
    className: Literal["license_plate"] = "license_plate"
class DetectionResponse(BaseModel):
    modelId: str
    detections: list[Detection]
    preprocessingMs: int
    inferenceMs: int
    postprocessingMs: int
    warnings: list[str]
class DetectRequest(BaseModel):
    modelId: str
    threshold: float = Field(default=0.25, ge=0.01, le=0.99)
    iouThreshold: float = Field(default=0.5, ge=0.1, le=0.95)
    strategy: Literal["full_image", "high_precision", "tiles", "two_pass"] = "full_image"

app = FastAPI(title="Private plate detector", docs_url=None, redoc_url=None)

def authorize(token: str | None):
    if not TOKEN or token != TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized detector request")

@lru_cache(maxsize=4)
def detector_for(model_id: str):
    if model_id not in SPECS:
        raise ValueError("Unsupported model")
    path = MODEL_ROOT / SPECS[model_id]["filename"]
    if not path.exists():
        raise FileNotFoundError(f"Model artifact unavailable: {model_id}")
    from open_image_models import create_detector
    return create_detector(str(path), backend="yolo_v9", class_labels=["License Plate"])

def classic_candidates(image: np.ndarray, model_id: str, threshold: float):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 75, 200)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
    connected = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = gray.shape[:2]; detections = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        ratio = w / max(h, 1); area = w * h / (width * height)
        if not (1.6 <= ratio <= 7.5 and 0.00008 <= area <= 0.08): continue
        density = cv2.countNonZero(edges[y:y+h, x:x+w]) / max(w * h, 1)
        score = min(0.99, density * 4.5)
        if score >= threshold:
            detections.append(Detection(box=Box(x=x/width, y=y/height, width=w/width, height=h/height), confidence=score, modelId=model_id))
    return detections

@app.get("/health")
def health():
    return {"status": "ok", "models": {model_id: (MODEL_ROOT / spec["filename"]).exists() for model_id, spec in SPECS.items()}}

@app.post("/v1/detect", response_model=DetectionResponse)
async def detect(modelId: str = Form(...), threshold: float = Form(default=0.25), iouThreshold: float = Form(default=0.5), strategy: Literal["full_image", "high_precision", "tiles", "two_pass"] = Form(default="full_image"), image: UploadFile = File(...), x_plate_detector_token: str | None = Header(default=None)):
    authorize(x_plate_detector_token)
    request = DetectRequest(modelId=modelId, threshold=threshold, iouThreshold=iouThreshold, strategy=strategy)
    body = await image.read()
    decoded = cv2.imdecode(np.frombuffer(body, np.uint8), cv2.IMREAD_COLOR)
    if decoded is None: raise HTTPException(status_code=400, detail="Invalid image")
    started = time.perf_counter()
    if request.modelId == "opencv-classic":
        detections = classic_candidates(decoded, request.modelId, request.threshold)
        elapsed = int((time.perf_counter() - started) * 1000)
        return DetectionResponse(modelId=request.modelId, detections=detections, preprocessingMs=0, inferenceMs=elapsed, postprocessingMs=0, warnings=["Classical heuristic scores are not calibrated probabilities."])
    try:
        detector = detector_for(request.modelId)
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    preprocessing_done = time.perf_counter()
    predictions = detector.predict(decoded, conf=request.threshold)
    inference_done = time.perf_counter()
    height, width = decoded.shape[:2]; detections = []
    for prediction in predictions:
        x1, y1, x2, y2 = [float(value) for value in prediction.bbox]
        detections.append(Detection(box=Box(x=max(0, x1/width), y=max(0, y1/height), width=min(1, (x2-x1)/width), height=min(1, (y2-y1)/height)), confidence=float(prediction.confidence), modelId=request.modelId))
    done = time.perf_counter()
    return DetectionResponse(modelId=request.modelId, detections=detections, preprocessingMs=int((preprocessing_done-started)*1000), inferenceMs=int((inference_done-preprocessing_done)*1000), postprocessingMs=int((done-inference_done)*1000), warnings=[])
