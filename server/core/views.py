# core/views.py
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.auth.models import User

from rest_framework import viewsets, status, filters, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

# --- MODELLER: Her biri aşağıda bir ViewSet içinde mühürlendi ---
from .models import (
    Department, Researcher, Project, Publication,
    FundingAgency, FundingAgencyGrant, Tag, EntityTag,
    Skill, ResearcherSkill, ProjectResearcher,
    AuthorPublication, CollaborationRequest, Notification
)

# --- SERIALIZERLAR: Hepsi aktif görevde ---
from .serializers import *

# --- SERVİSLER VE İZİNLER ---
from .services import get_collaboration_suggestions, generate_embedding, analyze_skills_with_gemini
from .permissions import IsAcademicianOrReadOnly, IsResearcherOwnerOrReadOnly

# -------------------------------------------------------------------------
# 1. ARAŞTIRMACI KONTROL ÜSSÜ (ResearcherViewSet)
# -------------------------------------------------------------------------

class ResearcherViewSet(viewsets.ModelViewSet):
    queryset = Researcher.objects.all().order_by('researcher_id')
    serializer_class = ResearcherSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # hatasını engelleyen otonom izin ayarı
    def get_permissions(self):
        if self.action in ['onboard']: return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """Profilini otonom yönetir."""
        researcher = request.user.researcher
        if request.method == 'PATCH':
            serializer = self.get_serializer(researcher, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(researcher).data)

    @action(detail=False, methods=['post'], url_path='onboard')
    def onboard(self, request):
        """Kayıt ve AI Yetenek Analizi."""
        serializer = ResearcherOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        try:
            with transaction.atomic():
                user = User.objects.create_user(username=d['email'], email=d['email'], password=d['password'])
                res = Researcher.objects.create(user=user, full_name=d['full_name'], email=d['email'], department_id=d['department_id'], bio=d.get('bio', ''), role=d.get('role', 'student'))
                if res.bio:
                    res.skills = analyze_skills_with_gemini(res.bio, res.department.name if res.department else "General")
                    res.embedding = generate_embedding(f"{res.title} {res.bio}")
                    res.save()
                return Response({"id": res.researcher_id}, status=201)
        except Exception as e: return Response({"detail": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='send-request')
    def send_request(self, request, pk=None):
        """ sorununu çözen otonom istek fırlatıcı."""
        receiver = self.get_object()
        sender = request.user.researcher
        serializer = SendCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if sender == receiver: return Response({"detail": "Kendine kilitlenemezsin!"}, status=400)
        req = CollaborationRequest.objects.create(sender=sender, receiver=receiver, project_id=serializer.validated_data['project_id'], request_type=serializer.validated_data['request_type'], message=serializer.validated_data.get('message', ''))
        return Response({"request_id": req.request_id}, status=201)

    @action(detail=False, methods=['post'], url_path='respond-request')
    def respond_request(self, request):
        """Gelen talebi kabul eder ve mürettebatı otonom olarak ProjectResearcher tablosuna mühürler."""
        serializer = RespondCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                r = CollaborationRequest.objects.get(request_id=serializer.validated_data['request_id'])
                r.status, r.response_message = serializer.validated_data['status'], serializer.validated_data.get('response_message', '')
                r.save()
                if r.status == 'accepted':
                    ProjectResearcher.objects.get_or_create(project=r.project, researcher=(r.receiver if r.request_type == 'invite' else r.sender), defaults={'role': 'Researcher'})
                    # Bildirim otonom olarak okundu işaretlenir
                    Notification.objects.filter(recipient=request.user.researcher, is_read=False).update(is_read=True)
                return Response({"status": r.status})
        except Exception as e: return Response({"detail": str(e)}, status=500)

# -------------------------------------------------------------------------
# 2. PROJE, YAYIN VE FON YÖNETİMİ
# -------------------------------------------------------------------------

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().select_related('pi', 'department')
    serializer_class = ProjectSerializer
    permission_classes = [IsAcademicianOrReadOnly]

    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        """FundingAgency ve FundingAgencyGrant modellerini aktif eder."""
        grants = FundingAgencyGrant.objects.filter(project_id=pk).select_related('funding_agency')
        return Response(FundingAgencyGrantSerializer(grants, many=True).data)

class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all()
    serializer_class = PublicationSerializer

    @action(detail=True, methods=['get'])
    def authors(self, request, pk=None):
        """AuthorPublication modelini aktif eder."""
        authors = AuthorPublication.objects.filter(publication_id=pk).select_related('researcher').order_by('author_order')
        return Response([{"name": a.researcher.full_name, "order": a.author_order} for a in authors])

# -------------------------------------------------------------------------
# 3. ANALİTİK VE SİSTEM GENELİ
# -------------------------------------------------------------------------

class DashboardViewSet(viewsets.ViewSet):
    """Department, Project ve Publication sayılarını otonom hesaplar."""
    @action(detail=False, methods=["get"], url_path="general-stats")
    def general_stats(self, request):
        return Response({"researchers": Researcher.objects.count(), "projects": Project.objects.count(), "publications": Publication.objects.count()})

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]