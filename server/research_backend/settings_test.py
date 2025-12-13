# research_backend/research_backend/settings_test.py

from .settings import *  # mevcut ayarları içe aktar

# TEST için Supabase kullanmayalım, basit bir SQLite DB kullanalım
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_db.sqlite3',
    }
}

# AI modelini testte kapatmak istersen (şart değil, sadece hız için)
# Örneğin core/services.py içinde AI_AVAILABLE = os.getenv("AI_AVAILABLE", "true") == "true"
# gibi bir yapı kurup burada:
# import os
# os.environ["AI_AVAILABLE"] = "false"
