import { api } from '@/lib/api';
import type { AuthResponse, RegisterCredentials } from '@/types';

export const authService = {
  // 🛰️ Giriş Yapma: /api/api/token/ hatasını engellemek için /api/ kaldırıldı
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const payload = {
      username: credentials.email,
      password: credentials.password
    };
    // baseURL'de /api olduğu için sadece /token/ yeterli
    const response = await api.post<AuthResponse>('/token/', payload);
    return response.data;
  },

  // 🛰️ Kayıt Olma
  register: async (data: RegisterCredentials) => {
    const response = await api.post('/register/', data);
    return response.data;
  },

  // 🛰️ ONBOARD: Hem User hem Researcher oluşturur
  onboard: async (data: any) => {
    const response = await api.post('/researchers/onboard/', data);
    return response.data;
  },

  // 🛰️ Profil Getir (Token ile)
  getProfile: async () => {
    const response = await api.get('/researchers/me/');
    return response.data;
  },

  // 🛰️ Token Yenileme
  refreshToken: async (refresh: string) => {
    const response = await api.post('/token/refresh/', { refresh });
    return response.data;
  },

  // 🛰️ Profil Güncelleme
  updateProfile: async (id: number, data: any) => {
    // PATCH kullanarak sadece değişen alanları gönderiyoruz
    const response = await api.patch(`/researchers/${id}/`, data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};