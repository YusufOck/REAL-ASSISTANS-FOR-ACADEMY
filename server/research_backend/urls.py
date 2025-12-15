from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

# Swagger için gerekli
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Anasayfayı direkt dokümantasyona yönlendir
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),

    path('admin/', admin.site.urls),

    # --- SWAGGER (Dokümantasyon) ---
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # --- TÜM API TRAFİĞİNİ CORE'A YÖNLENDİR ---
    # Login, Register, User işlemleri buradan yönetilecek
    path('api/', include('core.urls')),
]

# CSS dosyaları için
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)