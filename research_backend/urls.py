from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings             # <-- EKLENDİ
from django.conf.urls.static import static   # <-- EKLENDİ

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Anasayfa yönlendirmesi
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),

    path('admin/', admin.site.urls),
    
    # --- JWT GİRİŞ KAPILARI (LOGIN) ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Swagger & Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API Endpointleri
    path('api/', include('core.urls')),
]

# --- BU KISIM EKSİKTİ, BUNU EKLEMEK CSS SORUNUNU ÇÖZECEK ---
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)