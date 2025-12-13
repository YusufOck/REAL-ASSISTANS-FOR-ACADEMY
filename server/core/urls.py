from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 1. View'ları Çağırıyoruz
from .views import (
    RegisterView,  # <-- Kayıt işlemi için BU ŞART
    DepartmentViewSet,
    ResearcherViewSet,
    ProjectViewSet,
    PublicationViewSet,
    FundingAgencyViewSet,
    FundingAgencyGrantViewSet,
    TagViewSet,
    EntityTagViewSet,
    SkillViewSet,
    # 👇 HATA VERENLERİ KAPATTIK (Server düzelince açacağız)
    # DashboardStatsViewSet, 
    # NetworkGraphViewSet
)

# 2. Router Ayarları
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

# 👇 BUNLARI DA KAPATTIK
# router.register(r'dashboard', DashboardViewSet, basename='dashboard')
# router.register(r'network', NetworkViewSet, basename='network')

# 3. URL Yolları
urlpatterns = [
    # 👇 KAYIT İŞLEMİ (BU ÇALIŞACAK)
    path('register/', RegisterView.as_view(), name='register'),

    # 👇 HATA VEREN SATIRLARI KAPATTIK (NameError Sebebi Bunlardı)
    # path('dashboard/stats/', DashboardStatsViewSet.as_view({'get': 'list'}), name='dashboard-stats'),
    # path('network-graph/', NetworkGraphViewSet.as_view({'get': 'list'}), name='network-graph'),

    # Router Linkleri
    path('', include(router.urls)),
]