import axiosClient from './axiosClient'

export const incidentsApi = {
  submitCitizenReport: (payload) => axiosClient.post('/incidents/submit/', payload),

  // Backend resolves the case by tracking_code, not by internal UUID -
  // a citizen only ever has the tracking code they were given.
  uploadEvidence: (trackingCode, file, fileType) => {
    const formData = new FormData()
    formData.append('tracking_code', trackingCode)
    formData.append('file', file)
    formData.append('file_type', fileType)
    formData.append('original_filename', file.name)
    return axiosClient.post('/incidents/evidence/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  trackCase: (trackingCode) => axiosClient.get(`/incidents/track/${trackingCode}/`),

  listReports: (params) => axiosClient.get('/incidents/reports/', { params }),

  getReport: (id) => axiosClient.get(`/incidents/reports/${id}/`),

  updateReport: (id, payload) => axiosClient.patch(`/incidents/reports/${id}/`, payload),
}

/** Maps a browser File's MIME type to the backend's EvidenceFileType choices. */
export function inferEvidenceFileType(file) {
  if (file.type.startsWith('image/')) return 'IMAGE'
  if (file.type.startsWith('audio/')) return 'AUDIO'
  if (file.type === 'application/pdf') return 'DOCUMENT'
  return 'OTHER'
}
