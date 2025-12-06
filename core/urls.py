from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    ResearcherViewSet,
    ProjectViewSet,
    PublicationViewSet,
    FundingAgencyViewSet,
    FundingAgencyGrantViewSet,
    TagViewSet,
    EntityTagViewSet,
    SkillViewSet,
    DashboardViewSet
)

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
# --- YENİ EKLENEN SATIR ---
# Basename zorunludur çünkü queryset'i olmayan özel bir ViewSet bu.
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
urlpatterns = [
    path('', include(router.urls)),
]