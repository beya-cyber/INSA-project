from django.urls import path
from . import views

app_name = 'integrations'

urlpatterns = [
    path('freeze-orders/', views.AssetFreezeOrderListCreateView.as_view(), name='freeze-order-list'),
    path('freeze-orders/<uuid:order_id>/approve/', views.AssetFreezeOrderApproveView.as_view(), name='freeze-order-approve'),
    path('freeze-orders/<uuid:order_id>/acknowledge/', views.AssetFreezeOrderBankAcknowledgeView.as_view(), name='freeze-order-acknowledge'),

    path('telecom-orders/', views.TelecomEscalationOrderListCreateView.as_view(), name='telecom-order-list'),
    path('telecom-orders/<uuid:order_id>/approve/', views.TelecomEscalationOrderApproveView.as_view(), name='telecom-order-approve'),

    path('webhooks/bank-ack/', views.BankAcknowledgmentWebhookView.as_view(), name='bank-ack-webhook'),
]
