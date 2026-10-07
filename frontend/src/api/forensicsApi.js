import axiosClient from './axiosClient'

export const forensicsApi = {
  getLinkageGraph: (reportId) => axiosClient.get(`/forensics/linkage-graph/${reportId}/`),

  recomputeRisk: (reportId) => axiosClient.post(`/forensics/recompute-risk/${reportId}/`),

  listTransactionLedger: (reportId) =>
    axiosClient.get('/forensics/transaction-ledger/', { params: { report_id: reportId } }),

  addTransactionHop: (payload) => axiosClient.post('/forensics/transaction-ledger/', payload),
}
