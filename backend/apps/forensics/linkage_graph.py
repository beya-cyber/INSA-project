"""
Automated Scam Linkage Analysis & Multi-Hop Fund Traversal
(Module 2 + Module 3). Aggregates incoming reports to identify
recurring patterns and dynamically escalate the system risk score.
"""
import logging
from decimal import Decimal
from typing import Dict, List

import networkx as nx
from django.conf import settings
from django.db.models import Q

from apps.incidents.models import IncidentReport, IncidentStatus
from .models import ScamLinkageEdge, LinkageEdgeType, TransactionLedgerEntry

logger = logging.getLogger('ndsir')


class LinkageAnalysisEngine:
    """
    On each new incident report, this engine:
      1. Finds other reports sharing the same scammer phone number or
         destination account/wallet.
      2. Creates graph edges (persisted + in-memory via networkx) to
         support the Scam Linkage Visualizer.
      3. Recomputes the report's risk score using configurable weights.
      4. Auto-escalates status when the score crosses threshold.
    """

    def __init__(self):
        self.weights = settings.RISK_SCORE_WEIGHTS
        self.high_value_threshold = Decimal(str(settings.RISK_SCORE_HIGH_VALUE_THRESHOLD_ETB))
        self.escalate_threshold = settings.RISK_SCORE_AUTO_ESCALATE_THRESHOLD

    def analyze_report(self, report: IncidentReport) -> int:
        score = 0

        duplicate_phone_reports = self._find_duplicate_phone_reports(report)
        duplicate_account_reports = self._find_duplicate_account_reports(report)

        for other in duplicate_phone_reports:
            self._persist_edge(report, other, LinkageEdgeType.SHARED_SCAMMER_PHONE, report.scammer_phone_number)
            score += self.weights['DUPLICATE_SCAMMER_PHONE']

        for other in duplicate_account_reports:
            self._persist_edge(report, other, LinkageEdgeType.SHARED_DESTINATION_ACCOUNT, report.scammer_identifier)
            score += self.weights['DUPLICATE_DESTINATION_ACCOUNT']

        high_value_hops = TransactionLedgerEntry.objects.filter(
            report=report, amount__gte=self.high_value_threshold
        ).count()
        if high_value_hops:
            score += self.weights['HIGH_VALUE_TRANSACTION']

        max_hop = TransactionLedgerEntry.objects.filter(report=report).order_by('-hop_level').first()
        if max_hop and max_hop.hop_level > 0:
            score += self.weights['MULTI_HOP_DEPTH'] * max_hop.hop_level

        if not report.victim.is_verified:
            score += self.weights['UNVERIFIED_VICTIM_IDENTITY']

        if report.evidence_files.filter(authenticity_flag='FLAGGED').exists():
            score += self.weights['FLAGGED_EVIDENCE_AUTHENTICITY']

        score = max(0, min(score, 100))

        report.risk_score = score
        just_escalated = False
        if score >= self.escalate_threshold and report.status == IncidentStatus.PENDING:
            report.status = IncidentStatus.ESCALATED
            just_escalated = True
            logger.info("Auto-escalated report %s (score=%s)", report.tracking_code, score)
        report.save(update_fields=['risk_score', 'status'])

        if just_escalated:
            # Imported at call time, not module level, to avoid a circular
            # import: apps.tasks.tasks already imports this module inside
            # its own task bodies for the reverse direction.
            from apps.tasks.tasks import send_status_update_sms_task
            send_status_update_sms_task.delay(str(report.id), IncidentStatus.ESCALATED)

        return score

    def _find_duplicate_phone_reports(self, report: IncidentReport) -> List[IncidentReport]:
        if not report.scammer_phone_number:
            return []
        return list(
            IncidentReport.objects.filter(
                scammer_phone_number=report.scammer_phone_number
            ).exclude(id=report.id)
        )

    def _find_duplicate_account_reports(self, report: IncidentReport) -> List[IncidentReport]:
        if not report.scammer_identifier:
            return []
        return list(
            IncidentReport.objects.filter(
                scammer_identifier=report.scammer_identifier
            ).exclude(id=report.id)
        )

    def _persist_edge(self, report_a, report_b, edge_type, shared_value):
        if not shared_value:
            return
        ScamLinkageEdge.objects.get_or_create(
            source_report=report_a,
            target_report=report_b,
            edge_type=edge_type,
            shared_value=shared_value,
        )

    def build_networkx_graph(self, report: IncidentReport) -> nx.Graph:
        """
        Builds an in-memory graph rooted at `report` for the frontend's
        Vis.js/Recharts network visualizer. Returns node/edge lists
        suitable for JSON serialization.
        """
        graph = nx.Graph()
        graph.add_node(str(report.id), tracking_code=report.tracking_code, risk_score=report.risk_score)

        edges = ScamLinkageEdge.objects.filter(
            Q(source_report=report) | Q(target_report=report)
        ).select_related('source_report', 'target_report')

        for edge in edges:
            other = edge.target_report if edge.source_report_id == report.id else edge.source_report
            graph.add_node(str(other.id), tracking_code=other.tracking_code, risk_score=other.risk_score)
            graph.add_edge(
                str(report.id), str(other.id),
                edge_type=edge.edge_type, shared_value=edge.shared_value
            )

        return graph

    def graph_to_json(self, graph: nx.Graph) -> Dict:
        nodes = [{'id': n, **data} for n, data in graph.nodes(data=True)]
        links = [{'source': u, 'target': v, **data} for u, v, data in graph.edges(data=True)]
        return {'nodes': nodes, 'links': links}
