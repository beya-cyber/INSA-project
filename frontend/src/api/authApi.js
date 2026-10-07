import axiosClient from './axiosClient'

export const authApi = {
  login: (username, password) =>
    axiosClient.post('/auth/login/', { username, password }),

  registerCitizen: (payload) =>
    axiosClient.post('/auth/register/citizen/', payload),

  me: () => axiosClient.get('/auth/me/'),

  mfaEnroll: () => axiosClient.post('/auth/mfa/enroll/'),

  mfaConfirm: (token) => axiosClient.post('/auth/mfa/confirm/', { token }),

  requestPasswordReset: (identifier) =>
    axiosClient.post('/auth/password-reset/request/', { identifier }),

  confirmPasswordReset: (token, newPassword) =>
    axiosClient.post('/auth/password-reset/confirm/', { token, new_password: newPassword }),
}
