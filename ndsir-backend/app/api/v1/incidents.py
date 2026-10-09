from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import os
import shutil
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.incident import Incident, Evidence, ScamCategory, PaymentProvider, IncidentStatus
from app.tasks.process_evidence import process_uploaded_evidence

router = APIRouter(prefix="/incidents", tags=["Incidents Intake"])

# Secure storage directory for evidence
UPLOAD_DIR = os.getenv("EVIDENCE_UPLOAD_DIR", "/var/ndsir/evidence_storage")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_case_number() -> str:
    """Generates a human-readable unique case number (e.g. INSA-2026-89021)."""
    now = datetime.now(timezone.utc)
    unique_suffix = str(uuid.uuid4().int)[:5]
    return f"INSA-{now.year}-{unique_suffix}"


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_fraud_report(
    scam_category: ScamCategory = Form(...),
    reporter_phone: str = Form(...),
    scammer_phone: str | None = Form(None),
    target_provider: PaymentProvider | None = Form(None),
    transaction_reference: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Primary Public Citizen Intake Endpoint:
    1. Validates and saves fraud metadata to PostgreSQL.
    2. Stores raw evidence file to secure storage.
    3. Offloads SHA-256 hashing, EXIF stripping, and Amharic OCR to Celery workers.
    """
    try:
        # 1. Create Incident Record
        case_num = generate_case_number()
        new_incident = Incident(
            case_number=case_num,
            scam_category=scam_category,
            reporter_phone=reporter_phone,
            scammer_phone=scammer_phone,
            target_provider=target_provider,
            transaction_reference=transaction_reference,
            status=IncidentStatus.PENDING_PROCESSING,
            risk_score=0.0
        )
        
        db.add(new_incident)
        await db.flush()  # Flush to acquire generated new_incident.id UUID

        evidence_hash_placeholder = None

        # 2. Process File Upload (if evidence provided)
        if file and file.filename:
            # File validation (10MB limit check and MIME validation)
            allowed_mime_types = ["image/jpeg", "image/png", "audio/mpeg", "audio/wav"]
            if file.content_type not in allowed_mime_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid file type. Only JPEG, PNG images and MP3/WAV audio are permitted."
                )

            # Generate secure file path on local disk/storage
            file_extension = os.path.splitext(file.filename)[1]
            secure_filename = f"{new_incident.id}_{uuid.uuid4().hex[:8]}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, secure_filename)

            # Read and write file streams
            file_size = 0
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024):  # 1MB Chunks
                    file_size += len(chunk)
                    if file_size > 10 * 1024 * 1024:  # Enforce 10MB limit
                        os.remove(file_path)
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Uploaded file exceeds maximum size limit of 10MB."
                        )
                    buffer.write(chunk)

            # Create Evidence metadata entry in database
            new_evidence = Evidence(
                incident_id=new_incident.id,
                file_path=file_path,
                file_mime_type=file.content_type,
                file_size_bytes=file_size,
                sha256_hash="PENDING_BACKGROUND_HASH",  # Populated asynchronously
                is_sanitized=False
            )
            db.add(new_evidence)

            # 3. Trigger Asynchronous Celery Task
            # Passes file path and incident ID to background worker for OCR & Hashing
            process_uploaded_evidence.delay(file_path=file_path, incident_id=str(new_incident.id))

        await db.commit()

        return {
            "status": "success",
            "message": "Report submitted successfully.",
            "case_number": case_num,
            "incident_id": str(new_incident.id),
            "evidence_hash": evidence_hash_placeholder or "Processing in background task"
        }

    except Exception as e:
        await db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while logging the incident: {str(e)}"
        )