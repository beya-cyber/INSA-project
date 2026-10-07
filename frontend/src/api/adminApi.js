import axiosClient from './axiosClient'

export const adminApi = {
  listUsers: () => axiosClient.get('/auth/users/'),

  provisionUser: (payload) => axiosClient.post('/auth/provision/staff/', payload),

  toggleSuspend: (userId) => axiosClient.post(`/auth/users/${userId}/suspend/`),
}
