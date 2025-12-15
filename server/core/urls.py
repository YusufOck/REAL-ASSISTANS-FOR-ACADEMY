from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 1. JWT Token View'larını Çağırıyoruz (Giriş işlemleri için ŞART)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# 2. Kendi View'larımızı Çağırıyoruz
from .views import (
    RegisterView,
    DepartmentViewSet,
    ResearcherViewSet,
    ProjectViewSet,
    PublicationViewSet,
    FundingAgencyViewSet,
    FundingAgencyGrantViewSet,
    TagViewSet,
    EntityTagViewSet,
    SkillViewSet,
    # Hata verenleri şimdilik kapalı tutuyoruz
    # DashboardStatsViewSet, 
    # NetworkGraphViewSet
)

# 3. Router Ayarları
router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'researchers', ResearcherViewSet, basename='researcher')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'publications', PublicationViewSet, basename='publication')
router.register(r'funding-agencies', FundingAgencyViewSet, basename='funding-agency')
router.register(r'funding-grants', FundingAgencyGrantViewSet, basename='funding-grant')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'entity-tags', EntityTagViewSet, basename='entity-tag')
router.register(r'skills', SkillViewSet, basename='skill')

# 4. URL Yolları
urlpatterns = [
    # --- AUTH (KİMLİK DOĞRULAMA) ---
    # Kayıt Ol
    path('register/', RegisterView.as_view(), name='register'),
    
    # Giriş Yap (Token Al) - Bunu ana dosyadan buraya taşıdık
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # --- ROUTER (DİĞER API UÇLARI) ---
    path('', include(router.urls)),
]