import axiosClient from './axiosClient'

export const partnersApi = {
  listMyFreezeOrders: () => axiosClient.get('/integrations/freeze-orders/'),

  // Authenticated, browser-facing acknowledgment - distinct from the
  // HMAC-signed server-to-server webhook the backend also exposes for
  // EthSwitch's own systems to call directly.
  acknowledgeFreeze: (orderId) => axiosClient.post(`/integrations/freeze-orders/${orderId}/acknowledge/`),

  downloadLegalExport: (packageId) => axiosClient.get(`/audit/legal-export/${packageId}/download/`),

  listAuditLogs: (params) => axiosClient.get('/audit/logs/', { params }),
}
