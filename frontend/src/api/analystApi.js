import axiosClient from './axiosClient'

export const analystApi = {
  proposeFreeze: (payload) => axiosClient.post('/integrations/freeze-orders/', payload),
  approveFreeze: (orderId) => axiosClient.post(`/integrations/freeze-orders/${orderId}/approve/`),
  listFreezeOrders: () => axiosClient.get('/integrations/freeze-orders/'),

  proposeTelecomAction: (payload) => axiosClient.post('/integrations/telecom-orders/', payload),
  approveTelecomAction: (orderId) => axiosClient.post(`/integrations/telecom-orders/${orderId}/approve/`),
  listTelecomOrders: () => axiosClient.get('/integrations/telecom-orders/'),

  draftLegalExport: (payload) => axiosClient.post('/audit/legal-export/draft/', payload),
  approveLegalExport: (packageId) => axiosClient.post(`/audit/legal-export/${packageId}/approve/`),
}
