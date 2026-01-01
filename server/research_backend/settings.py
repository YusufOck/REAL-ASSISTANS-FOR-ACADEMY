"""
Django settings for research_backend project.
Mühürleme Tarihi: 2026-01-01
"""

import dj_database_url
from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# 🚀 MÜHÜR: .env dosyasını yükle (Kritik Güvenlik)
load_dotenv(os.path.join(BASE_DIR, '.env'))

# --- CORE SECRETS (.env üzerinden) ---
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# --- NETWORK SECURITY ---
# Üretim ortamında '*' kullanımı büyük bir zayıf noktadır. Sadece bilinen domainlere izin veriyoruz.
ALLOWED_HOSTS = [
    'reserchos.com.tr', 
    'www.reserchos.com.tr', 
    'real-assistans-for-academy-cbun.onrender.com',
    'localhost',
    '127.0.0.1'
]

CSRF_TRUSTED_ORIGINS = [
    "https://*.onrender.com",
    "https://real-assistans-for-academy.vercel.app",
    "https://reserchos.com.tr",
    "https://www.reserchos.com.tr"
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',

    # 3rd-party
    'jazzmin',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'drf_spectacular_sidecar',
    'core',
    'django_filters',
    'rest_framework_simplejwt',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # En üstte kalmalı
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'research_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'research_backend.wsgi.application'

# 🚀 MÜHÜR: Veritabanı Ayarı (Hassas Veri Gizlendi)
# Supabase şifren artık kodun içinde değil, sadece .env içinde güvende.
DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        conn_max_age=0,        # ⚠️ KRİTİK: 512MB RAM için 0 olmalı, bağlantıların şişmesini engeller.
        ssl_require=True       # Supabase bağlantısı için SSL şarttır.
    )
}

# 🛠️ MOTOR SEVİYESİNDE SSL: 
# 'server didn't return client encoding' hatalarının kesin çözümüdür.
DATABASES['default']['OPTIONS'] = {
    'sslmode': 'require',
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (Whitenoise entegrasyonu korunmuştur)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 🚀 MÜHÜR: CORS Ayarları (Gereksiz ALL_ORIGINS kaldırıldı)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://real-assistans-for-academy.vercel.app",
    "https://reserchos.com.tr",
    "https://www.reserchos.com.tr"
]

# JWT Yapılandırması
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Documentation Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Research Platform API',
    'DESCRIPTION': 'Academic Research Management System',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SECURITY': [{'Bearer': []}], 
}