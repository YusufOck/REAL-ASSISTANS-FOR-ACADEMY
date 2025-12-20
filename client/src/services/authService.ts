import { api } from '@/lib/api';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '@/types';

export const authService = {
  // Giriş Yapma Fonksiyonu
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    // Backend Django 'username' bekler, biz 'email' gönderiyoruz.
    // Eşlemeyi burada yapıyoruz ki Login.tsx temiz kalsın.
    const payload = {
      username: credentials.email,
      password: credentials.password
    };
    const response = await api.post<AuthResponse>('/api/token/', payload);
    return response.data;
  },

  // Kayıt Olma (Standart - Kullanılmıyor olabilir ama kalsın)
  register: async (data: RegisterCredentials) => {
    const response = await api.post('/api/register/', data);
    return response.data;
  },

  // ONBOARD (Gerçek Kayıt): Hem User hem Researcher oluşturur.
  onboard: async (data: any) => {
    const response = await api.post('/api/researchers/onboard/', data);
    return response.data;
  },

  // Profil Getir (Token ile)
  getProfile: async () => {
    const response = await api.get('/api/researchers/me/');
    return response.data;
  },

  // Token Yenileme
  refreshToken: async (refresh: string) => {
    const response = await api.post('/api/token/refresh/', { refresh });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};