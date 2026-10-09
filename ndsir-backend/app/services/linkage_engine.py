 from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.incident import Incident, IncidentStatus

class LinkageEngine:
    @staticmethod
    async def calculate_risk_score(db: AsyncSession, scammer_phone: str | None, tx_ref: str | None) -> float:
        """
        Calculates dynamic risk score (0.0 to 100.0) based on cross-incident correlations.
        """
        if not scammer_phone and not tx_ref:
            return 10.0

        score = 20.0  # Base score

        # Count total incidents linking same scammer phone
        if scammer_phone:
            stmt = select(func.count(Incident.id)).where(Incident.scammer_phone == scammer_phone)
            res = await db.execute(stmt)
            phone_matches = res.scalar() or 0
            score += min(phone_matches * 15.0, 45.0)

        # Count total incidents linking same transaction/account reference
        if tx_ref:
            stmt = select(func.count(Incident.id)).where(Incident.transaction_reference == tx_ref)
            res = await db.execute(stmt)
            tx_matches = res.scalar() or 0
            score += min(tx_matches * 25.0, 35.0)

        return min(score, 100.0)

    @staticmethod
    async def get_linked_incidents(db: AsyncSession, scammer_phone: str | None):
        """Finds all associated incident reports linked to the same entity."""
        if not scammer_phone:
            return []
        stmt = select(Incident).where(
            Incident.scammer_phone == scammer_phone
        ).order_by(Incident.created_at.desc())
        res = await db.execute(stmt)
        return res.scalars().all()