import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
};

export const projectsAPI = {
  create: (data) => api.post('/projects', data),
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, uid) => api.delete(`/projects/${id}/members/${uid}`),
  changeRole: (id, uid, role) => api.patch(`/projects/${id}/members/${uid}/role`, { role }),
};

export const tasksAPI = {
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  list: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  get: (projectId, id) => api.get(`/projects/${projectId}/tasks/${id}`),
  update: (projectId, id, data) => api.put(`/projects/${projectId}/tasks/${id}`, data),
  delete: (projectId, id) => api.delete(`/projects/${projectId}/tasks/${id}`),
  updateStatus: (projectId, id, status) =>
    api.patch(`/projects/${projectId}/tasks/${id}/status`, { status }),
};

export const commentsAPI = {
  add: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  list: (taskId) => api.get(`/tasks/${taskId}/comments`),
  delete: (taskId, id) => api.delete(`/tasks/${taskId}/comments/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
};
