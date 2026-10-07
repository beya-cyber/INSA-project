from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsINSAAnalyst
from apps.incidents.models import IncidentReport

from .linkage_graph import LinkageAnalysisEngine
from .models import TransactionLedgerEntry
from .serializers import (
    TransactionLedgerEntrySerializer,
    LinkageGraphResponseSerializer,
)


class ScamLinkageGraphView(APIView):
    """
    Backing endpoint for the Scam Linkage Visualizer (Frontend Phase 2.4).
    Returns a node/edge graph rooted at the requested incident report.
    """
    permission_classes = [permissions.IsAuthenticated, IsINSAAnalyst]

    def get(self, request, report_id):
        try:
            report = IncidentReport.objects.get(id=report_id)
        except IncidentReport.DoesNotExist:
            return Response({'detail': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        engine = LinkageAnalysisEngine()
        graph = engine.build_networkx_graph(report)
        payload = engine.graph_to_json(graph)
        return Response(LinkageGraphResponseSerializer(payload).data)


class RecomputeRiskScoreView(APIView):
    """Manually triggers risk re-scoring for a report (e.g. after new evidence)."""
    permission_classes = [permissions.IsAuthenticated, IsINSAAnalyst]

    def post(self, request, report_id):
        try:
            report = IncidentReport.objects.get(id=report_id)
        except IncidentReport.DoesNotExist:
            return Response({'detail': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        engine = LinkageAnalysisEngine()
        score = engine.analyze_report(report)
        return Response({'report_id': str(report.id), 'risk_score': score, 'status': report.status})


class TransactionLedgerListCreateView(generics.ListCreateAPIView):
    """Multi-hop fund traversal ledger (Module 3)."""
    serializer_class = TransactionLedgerEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsINSAAnalyst]

    def get_queryset(self):
        qs = TransactionLedgerEntry.objects.select_related('report').all()
        report_id = self.request.query_params.get('report_id')
        if report_id:
            qs = qs.filter(report_id=report_id)
        return qs.order_by('hop_level')
