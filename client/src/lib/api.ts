import axios from 'axios';

// .env dosyasından URL'i alıyoruz
const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. REQUEST INTERCEPTOR (Aynı kalıyor)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. RESPONSE INTERCEPTOR (DÜZELTİLEN KISIM)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Eğer hata 401 (Yetkisiz) ise
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // 👇 EKLENEN KRİTİK KONTROL 👇
      // Eğer kullanıcı zaten '/login' sayfasındaysa, sayfayı yenileme/yönlendirme yapma!
      // Hatayı direkt Login.tsx'e fırlat ki o kırmızı kutu çıkabilsin.
      if (window.location.pathname === '/login') {
         return Promise.reject(error);
      }

      // Eğer Dashboard gibi içerideyse ve token süresi bittiyse dışarı at:
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Kullanıcıyı dışarı at
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);