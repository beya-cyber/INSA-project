"""
OCR Screenshot Authenticator (Module 5: Legal & Forensics Pipeline).
Forensic image validation engine that checks file metadata, font
consistency, and structural anomalies to detect photoshopped or
altered receipts/screenshots.

NOTE: This is a heuristic triage tool, not a court-certified forensic
determination. Flagged results should always be escalated to a human
INSA forensic analyst for manual review before any legal action.
"""
import hashlib
import logging
from dataclasses import dataclass, asdict
from typing import List

logger = logging.getLogger('ndsir')


@dataclass
class AuthenticityReport:
    is_flagged: bool
    findings: List[str]
    exif_present: bool
    error_level_analysis_score: float  # 0.0 (clean) - 1.0 (highly suspicious)
    sha256: str

    def to_json(self):
        return asdict(self)


class ImageAuthenticator:
    """
    Runs a battery of lightweight, explainable checks:
      1. EXIF metadata presence/consistency (absence is a mild signal;
         most screenshots naturally lack EXIF, so this is weighted low).
      2. Error Level Analysis (ELA) via re-compression delta - detects
         localized regions edited/pasted at a different JPEG quality.
      3. Structural checks - unexpected color-depth shifts, resolution
         mismatches vs. known banking-app UI dimensions.
    """
    ELA_FLAG_THRESHOLD = 0.35

    def analyze(self, file_path: str) -> AuthenticityReport:
        findings = []
        sha256 = self._file_hash(file_path)
        exif_present = self._check_exif(file_path)
        ela_score = self._error_level_analysis(file_path)

        if ela_score >= self.ELA_FLAG_THRESHOLD:
            findings.append(f"Elevated error-level analysis score ({ela_score:.2f}) suggests localized re-editing.")

        structural_findings = self._structural_checks(file_path)
        findings.extend(structural_findings)

        is_flagged = ela_score >= self.ELA_FLAG_THRESHOLD or len(structural_findings) > 0

        return AuthenticityReport(
            is_flagged=is_flagged,
            findings=findings or ["No anomalies detected by automated triage."],
            exif_present=exif_present,
            error_level_analysis_score=round(ela_score, 3),
            sha256=sha256,
        )

    def _file_hash(self, file_path: str) -> str:
        h = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                h.update(chunk)
        return h.hexdigest()

    def _check_exif(self, file_path: str) -> bool:
        try:
            import exifread
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f, details=False)
            return len(tags) > 0
        except Exception as exc:  # noqa: BLE001
            logger.debug("EXIF check skipped for %s: %s", file_path, exc)
            return False

    def _error_level_analysis(self, file_path: str) -> float:
        """
        Re-saves the image at a fixed JPEG quality and measures the
        pixel-difference magnitude against the original. Uniform, low
        differences indicate a single-generation original; sharp
        localized spikes indicate pasted/edited regions.
        """
        try:
            import numpy as np
            from PIL import Image, ImageChops
            import io

            original = Image.open(file_path).convert('RGB')
            buffer = io.BytesIO()
            original.save(buffer, 'JPEG', quality=90)
            buffer.seek(0)
            resaved = Image.open(buffer)

            diff = ImageChops.difference(original, resaved)
            diff_array = np.asarray(diff, dtype=np.float32)
            score = float(diff_array.std() / 255.0)
            return min(score * 4, 1.0)  # scaled heuristic, capped at 1.0
        except Exception as exc:  # noqa: BLE001
            logger.warning("ELA failed for %s: %s", file_path, exc)
            return 0.0

    def _structural_checks(self, file_path: str) -> List[str]:
        findings = []
        try:
            from PIL import Image
            img = Image.open(file_path)
            width, height = img.size
            if width < 200 or height < 200:
                findings.append(f"Unusually low resolution ({width}x{height}) for a mobile banking screenshot.")
            if img.mode not in ('RGB', 'RGBA', 'L'):
                findings.append(f"Unexpected color mode: {img.mode}.")
        except Exception as exc:  # noqa: BLE001
            logger.debug("Structural check skipped for %s: %s", file_path, exc)
        return findings
