"""Explicit local-only model bootstrap. Never invoke from the detector request path."""
import hashlib
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("PLATE_MODEL_ROOT", "/models")); ROOT.mkdir(parents=True, exist_ok=True)
LOCK = json.loads((Path(__file__).parent.parent / "models.lock.json").read_text())
BASE = "https://github.com/ankandrew/open-image-models/releases/download/assets"
for entry in LOCK["models"]:
    expected = entry.get("sha256")
    if not expected: raise SystemExit(f"Refusing unpinned model {entry['id']}; set its reviewed SHA-256 in models.lock.json")
    destination = ROOT / entry["filename"]
    if not destination.exists(): urllib.request.urlretrieve(f"{BASE}/{entry['filename']}", destination)
    actual = hashlib.sha256(destination.read_bytes()).hexdigest()
    if actual != expected: destination.unlink(missing_ok=True); raise SystemExit(f"Checksum mismatch for {entry['id']}")
    print(f"Verified {entry['id']}")
