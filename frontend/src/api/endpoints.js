import api from './client';

export const authApi = {
  signup: (data) => api.post('/auth/signup', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const eventsApi = {
  list: () => api.get('/events').then((r) => r.data),
  get: (id) => api.get(`/events/${id}`).then((r) => r.data),
};

export const reservationApi = {
  reserve: (eventId, seatNumbers) =>
    api.post('/reserve', { eventId, seatNumbers }).then((r) => r.data),
};

export const bookingApi = {
  create: (reservationId) => api.post('/bookings', { reservationId }).then((r) => r.data),
};
