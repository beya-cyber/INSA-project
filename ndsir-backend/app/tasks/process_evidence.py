import os
from app.tasks.worker import celery_app
from app.core.security import calculate_sha256, sanitize_and_strip_exif
from app.services.ocr_engine import ReceiptOCREngine

ocr_engine = ReceiptOCREngine()

@celery_app.task(name="tasks.process_uploaded_evidence")
def process_uploaded_evidence(file_path: str, incident_id: str):
    """
    Asynchronous Celery task that:
    1. Generates a SHA-256 chain-of-custody hash.
    2. Strips EXIF metadata.
    3. Runs Tesseract OCR (Amharic + English).
    4. Extracts structured transaction details.
    """
    if not os.path.exists(file_path):
        return {"status": "FAILED", "error": "File not found"}

    # Step 1: Calculate SHA-256 Hash
    sha256_hash = calculate_sha256(file_path)

    # Step 2: Sanitize Metadata
    sanitized_path = f"{file_path}_sanitized.png"
    sanitization_success = sanitize_and_strip_exif(file_path, sanitized_path)
    target_path = sanitized_path if sanitization_success else file_path

    # Step 3: Run OCR Engine
    raw_text = ocr_engine.extract_text(target_path)
    parsed_metadata = ocr_engine.parse_receipt_data(raw_text)

    # Step 4: Cleanup temporary files if needed
    if sanitization_success and os.path.exists(sanitized_path):
        os.remove(sanitized_path)

    return {
        "status": "SUCCESS",
        "incident_id": incident_id,
        "sha256_hash": sha256_hash,
        "raw_text": raw_text,
        "parsed_metadata": parsed_metadata
    }