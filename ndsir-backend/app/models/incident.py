# app/models/incident.py

import enum
from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    String, Text, DateTime, ForeignKey, Enum as SQLEnum, Float, Integer, JSON
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

class Base(DeclarativeBase):
    pass

class ScamCategory(str, enum.Enum):
    VOICE_SCAM = "VOICE_SCAM"
    SMS_IMPERSONATION = "SMS_IMPERSONATION"
    PHISHING_LINK = "PHISHING_LINK"
    SOCIAL_MEDIA = "SOCIAL_MEDIA"

class IncidentStatus(str, enum.Enum):
    PENDING_PROCESSING = "PENDING_PROCESSING"
    TRIAGED = "TRIAGED"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    TEMPORARY_FREEZE_ISSUED = "TEMPORARY_FREEZE_ISSUED"
    DISMISSED = "DISMISSED"
    ESCALATED_TO_POLICE = "ESCALATED_TO_POLICE"

class PaymentProvider(str, enum.Enum):
    TELEBIRR = "TELEBIRR"
    CBE_BIRR = "CBE_BIRR"
    CBE_BANK = "CBE_BANK"
    AWASH_BIRR = "AWASH_BIRR"
    MPESA = "MPESA"
    OTHER = "OTHER"

class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    reporter_phone: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    scam_category: Mapped[ScamCategory] = mapped_column(SQLEnum(ScamCategory), nullable=False)
    
    scammer_phone: Mapped[str | None] = mapped_column(String(20), index=True, nullable=True)
    target_provider: Mapped[PaymentProvider | None] = mapped_column(SQLEnum(PaymentProvider), nullable=True)
    transaction_reference: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    
    status: Mapped[IncidentStatus] = mapped_column(
        SQLEnum(IncidentStatus), default=IncidentStatus.PENDING_PROCESSING, nullable=False
    )
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    evidence_items: Mapped[list["Evidence"]] = relationship("Evidence", back_populates="incident", cascade="all, delete-orphan")
    extracted_data: Mapped["ExtractedMetadata | None"] = relationship("ExtractedMetadata", back_populates="incident", uselist=False)
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="incident")

class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    file_mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Forensic Integrity
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    is_sanitized: Mapped[bool] = mapped_column(default=False)
    
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    incident: Mapped["Incident"] = relationship("Incident", back_populates="evidence_items")

class ExtractedMetadata(Base):
    __tablename__ = "extracted_metadata"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, unique=True)
    
    raw_ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_account_number: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    parsed_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    parsed_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    raw_json_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="extracted_data")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    
    action_taken: Mapped[str] = mapped_column(String(128), nullable=False)
    performed_by: Mapped[str] = mapped_column(String(128), nullable=False)  # User ID or System Worker
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="audit_logs")