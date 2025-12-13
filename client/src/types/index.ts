// client/src/types/index.ts

// Backend'den (Django) giriş yapınca dönecek cevabın tipi
export interface AuthResponse {
  access: string;   // Erişim anahtarı
  refresh: string;  // Yenileme anahtarı
}

// Giriş formundan göndereceğimiz verilerin tipi
export interface LoginCredentials {
  username: string; // Django varsayılan olarak 'username' bekler
  password: string;
}

// İleride kullanıcı bilgilerini de buraya ekleyeceğiz
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}