from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.models.incident import Incident, IncidentStatus, AuditLog
from app.services.linkage_engine import LinkageEngine

router = APIRouter(prefix="/triage", tags=["INSA Triage Console"])

@router.get("/incidents")
async def get_all_incidents(db: AsyncSession = Depends(get_db)):
    """Fetch all submitted incidents ordered by highest risk score."""
    stmt = select(Incident).order_by(Incident.risk_score.desc(), Incident.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/incidents/{incident_id}")
async def get_incident_details(incident_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fetch detailed incident report with linkage analysis."""
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident record not found")

    linked = await LinkageEngine.get_linked_incidents(db, incident.scammer_phone)
    return {
        "incident": incident,
        "linked_incidents_count": len(linked),
        "linked_cases": [i.case_number for i in linked if i.id != incident.id]
    }

@router.post("/incidents/{incident_id}/action")
async def execute_triage_action(
    incident_id: uuid.UUID,
    action: str,  # TEMPORARY_FREEZE, DISMISS, ESCALATE
    analyst_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Executes administrative action (e.g., Temporary Bank Lock or Telecom SIM Block)."""
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident record not found")

    if action == "TEMPORARY_FREEZE":
        incident.status = IncidentStatus.TEMPORARY_FREEZE_ISSUED
    elif action == "ESCALATE":
        incident.status = IncidentStatus.ESCALATED_TO_POLICE
    elif action == "DISMISS":
        incident.status = IncidentStatus.DISMISSED

    # Log audit entry
    log = AuditLog(
        incident_id=incident.id,
        action_taken=f"ACTION_EXECUTED: {action}",
        performed_by=analyst_id,
        details=f"Status updated to {incident.status.value}"
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "new_incident_status": incident.status.value}