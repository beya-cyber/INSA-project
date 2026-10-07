from django.urls import path
from . import views

app_name = 'forensics'

urlpatterns = [
    path('linkage-graph/<uuid:report_id>/', views.ScamLinkageGraphView.as_view(), name='linkage-graph'),
    path('recompute-risk/<uuid:report_id>/', views.RecomputeRiskScoreView.as_view(), name='recompute-risk'),
    path('transaction-ledger/', views.TransactionLedgerListCreateView.as_view(), name='transaction-ledger'),
]
