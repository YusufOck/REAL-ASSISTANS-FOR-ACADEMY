import { api } from '@/lib/api';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '@/types';


export const authService = {
  // Giriş Yapma Fonksiyonu
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // DÜZELTİLDİ: /token/ -> /api/token/
    const response = await api.post<AuthResponse>('/api/token/', credentials);
    return response.data;
  },

  // Kayıt Olma Fonksiyonu
  register: async (data: RegisterCredentials) => {
    // DÜZELTİLDİ: /register/ -> /api/register/
    const response = await api.post('/api/register/', data);
    return response.data;
  },

  // Token Yenileme
  refreshToken: async (refresh: string) => {
    // DÜZELTİLDİ: /token/refresh/ -> /api/token/refresh/
    const response = await api.post('/api/token/refresh/', { refresh });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  // authService objesinin içine şu fonksiyonu ekle:

  // Profil Getir (Token ile)
  getProfile: async () => {
    // Backend'deki yeni endpoint'e istek atıyoruz
    // NOT: Token, api.ts içindeki interceptor sayesinde otomatik eklenecek.
    const response = await api.get('/api/researchers/me/');
    return response.data;
  },

  
};