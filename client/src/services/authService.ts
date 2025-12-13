import { api } from '@/lib/api';
// 👇 RegisterCredentials'ı buraya ekledik
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '@/types';

export const authService = {
  // Giriş Yapma Fonksiyonu
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Backend'e POST isteği atıyoruz
    const response = await api.post<AuthResponse>('/token/', credentials);
    return response.data;
  },

  // 👇 YENİ EKLENEN KISIM: Kayıt Olma Fonksiyonu
  register: async (data: RegisterCredentials) => {
    // Backend'deki /api/register/ adresine verileri gönderir
    const response = await api.post('/register/', data);
    return response.data;
  },

  // Token Yenileme (İleride kullanacağız)
  refreshToken: async (refresh: string) => {
    const response = await api.post('/token/refresh/', { refresh });
    return response.data;
  },

  // Çıkış Yapma (Sadece tarayıcıdan siler)
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};