# Browser detector provenance and license status

Reviewed 2026-10-25. **Commercial redistribution approval remains blocked.** The existing detector was preserved; no replacement was introduced.

- Artifact: `public/models/yolo-v9-t-512-license-plates-end2end.onnx`, added in commit `a89acdd`.
- SHA-256: `746fdd358ec110418775d7c9d8d07910d48b1a21471f92bf4421f6510d6daade`.
- Recorded source: Open Image Models assets. The upstream [model hub](https://github.com/ankandrew/open-image-models/blob/main/open_image_models/detection/core/hub.py) points this filename at its GitHub `assets` release.
- Upstream [code license](https://github.com/ankandrew/open-image-models/blob/main/LICENSE) is MIT. That alone does not establish rights to the specific weights, training datasets, or commercial redistribution of the checked-in binary.
- The repository has no model-specific weight license, training dataset provenance or signed approval. Historical laboratory metadata explicitly classified these weights as evaluation-only. No accuracy result here establishes performance on Argentine/Mercosur plates.

Before commercial public distribution, obtain explicit evidence covering these exact weights and dataset rights, retain the artifact digest and required attribution, and record an approval decision. Keeping the existing file in this consolidation is not such approval. Do not silently substitute another detector.

The application serves all inference assets locally. Checked-in `/ort/` files match the installed ONNX Runtime Web distribution. Its upstream licenses/third-party notices remain available in the package; preserve those notices when distributing binaries. A browser acceptance test loads the real model and WASM and verifies no image request leaves the device.
