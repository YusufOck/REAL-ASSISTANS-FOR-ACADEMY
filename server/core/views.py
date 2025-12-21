# core/views.py
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q, F
from django.contrib.auth.models import User
import itertools # Network ilişkileri için

from rest_framework import viewsets, status, filters, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

# Modeller ve Serializerlar (TÜMÜ KORUNDU)
from .models import *
from .serializers import *
from .services import get_collaboration_suggestions, generate_embedding, analyze_skills_with_gemini
from .permissions import IsAcademicianOrReadOnly, IsResearcherOwnerOrReadOnly

# -------------------------
#  Basit CRUD ViewSet'ler (URLs.py bağımlılıkları için tam liste)
# -------------------------

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by('tag_id')
    serializer_class = TagSerializer

class EntityTagViewSet(viewsets.ModelViewSet):
    queryset = EntityTag.objects.all().order_by('entity_tag_id')
    serializer_class = EntityTagSerializer

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all().order_by('skill_id')
    serializer_class = SkillSerializer

class FundingAgencyViewSet(viewsets.ModelViewSet):
    queryset = FundingAgency.objects.all().order_by('funding_agency_id')
    serializer_class = FundingAgencySerializer

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        # ORM Dönüşümü: İlişkili projeleri otonom çek
        projects = Project.objects.filter(funding_grants__funding_agency_id=pk).distinct().values('project_id', 'title', 'status')
        return Response(list(projects))

class FundingAgencyGrantViewSet(viewsets.ModelViewSet):
    queryset = FundingAgencyGrant.objects.all().order_by('grant_id')
    serializer_class = FundingAgencyGrantSerializer

# -------------------------
#  ANA MOTOR: RESEARCHER VIEWSET
# -------------------------

class ResearcherViewSet(viewsets.ModelViewSet):
    queryset = Researcher.objects.all().order_by('researcher_id')
    serializer_class = ResearcherSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'onboard': return [AllowAny()]
        return super().get_permissions()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {'department': ['exact'], 'title': ['icontains'], 'full_name': ['icontains']}
    search_fields = ['full_name', 'email', 'bio']

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        try:
            researcher = Researcher.objects.get(user=request.user)
            if request.method == 'PATCH':
                serializer = self.get_serializer(researcher, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data)
            return Response(self.get_serializer(researcher).data)
        except Researcher.DoesNotExist: return Response({"detail": "Profil bulunamadı."}, status=404)

    # core/views.py -> ResearcherViewSet

    def perform_update(self, serializer):
        # 1. Slider değerini (veya bio'yu) veritabanına yaz
        instance = serializer.save()

        # 2. Yetenekleri 'ağırlıklı' bir metne dönüştür 🛰️
        # Örn: "Senior Python Expert (Level: 95)"
        skill_weights = ", ".join([
            f"{s.skill.name} Expert (Level: {s.level})" 
            for s in instance.researcher_skills.select_related('skill').all()
            if s.level > 80  # Sadece uzman olduğu alanları vektöre baskın yap
        ])

        # 3. Vektörü (Embedding) bu ağırlıklı veriyle mühürle
        # Artık slider değiştikçe AI seni farklı bir 'uzmanlık seviyesinde' görecek!
        semantic_text = f"{instance.title}. {instance.bio}. Uzmanlıklar: {skill_weights}"
        instance.embedding = generate_embedding(semantic_text)
        instance.save()
        
        print(f"✅ Otonom Radar: {instance.full_name} için slider-bazlı yeni vektör üretildi.")

    @action(detail=False, methods=['post'], url_path='onboard', permission_classes=[AllowAny])
    def onboard(self, request):
        serializer = ResearcherOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        try:
            with transaction.atomic():
                user = User.objects.create_user(username=d['email'], email=d['email'], password=d['password'])
                res = Researcher.objects.create(user=user, full_name=d['full_name'], email=d['email'], department_id=d['department_id'], bio=d.get('bio', ''), role=d.get('role', 'student'))
                if d.get('create_project'):
                    p = d['create_project']
                    proj = Project.objects.create(title=p['title'], summary=p.get('summary', ''), pi=res, department_id=d['department_id'])
                    ProjectResearcher.objects.create(project=proj, researcher=res, role="Principal Investigator", joined_at=timezone.now())
                return Response({"id": res.researcher_id}, status=201)
        except Exception as e: return Response({"detail": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='send-request')
    def send_request(self, request, pk=None):
        receiver = self.get_object(); sender = request.user.researcher
        serializer = SendCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = CollaborationRequest.objects.create(sender=sender, receiver=receiver, project_id=serializer.validated_data['project_id'], request_type=serializer.validated_data['request_type'], message=serializer.validated_data.get('message', ''))
        return Response({"request_id": req.request_id}, status=201)

    @action(detail=False, methods=['post'], url_path='respond-request')
    def respond_request(self, request):
        serializer = RespondCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        try:
            with transaction.atomic():
                r = CollaborationRequest.objects.get(request_id=d['request_id'])
                r.status, r.response_message = d['status'], d.get('response_message', '')
                r.save()
                if d['status'] == 'accepted':
                    role = "Collaborator" if r.request_type == 'invite' else "Researcher"
                    new_m = r.receiver if r.request_type == 'invite' else r.sender
                    ProjectResearcher.objects.get_or_create(project=r.project, researcher=new_m, defaults={'role': role})
                Notification.objects.filter(recipient=r.receiver, is_read=False).update(is_read=True)
            return Response({"status": d['status']})
        except Exception as e: return Response({"detail": str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        # ORM DÖNÜŞÜMÜ
        projs = Project.objects.filter(memberships__researcher_id=pk).values('project_id', 'title', 'status', 'start_date', 'end_date')
        return Response(list(projs))

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        # ORM DÖNÜŞÜMÜ
        skills = ResearcherSkill.objects.filter(researcher_id=pk).values(id=F('skill__skill_id'), name=F('skill__name'), level=F('level'))
        return Response(list(skills))

# -------------------------
#  PROJE VE YAYIN VIEWSETLER
# -------------------------

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('project_id')
    serializer_class = ProjectSerializer
    permission_classes = [IsAcademicianOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {'department': ['exact'], 'status': ['icontains']}

    @action(detail=True, methods=['get'])
    def researchers(self, request, pk=None):
        # ORM DÖNÜŞÜMÜ
        ms = ProjectResearcher.objects.filter(project_id=pk).select_related('researcher')
        return Response([{"researcher_id": m.researcher.researcher_id, "full_name": m.researcher.full_name, "role": m.role} for m in ms])

    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        # ORM DÖNÜŞÜMÜ
        d = request.data
        ProjectResearcher.objects.create(project_id=pk, researcher_id=d['researcher_id'], role=d.get('role', 'Researcher'), joined_at=timezone.now())
        return Response({"detail": "Eklendi"}, status=201)

    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        grants = FundingAgencyGrant.objects.filter(project_id=pk).select_related('funding_agency')
        return Response(FundingAgencyGrantSerializer(grants, many=True).data)

class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all().order_by('publication_id')
    serializer_class = PublicationSerializer

    @action(detail=True, methods=['get'])
    def authors(self, request, pk=None):
        # ORM DÖNÜŞÜMÜ
        auths = AuthorPublication.objects.filter(publication_id=pk).select_related('researcher').order_by('author_order')
        return Response([{"researcher_id": a.researcher.researcher_id, "full_name": a.researcher.full_name, "order": a.author_order} for a in auths])

# -------------------------
#  NETWORK VE DASHBOARD
# -------------------------

class NetworkViewSet(viewsets.ViewSet):
    @extend_schema(responses={200: NetworkGraphSerializer})
    def list(self, request):
        nodes = [{"id": r.researcher_id, "label": r.full_name, "group": r.department.name if r.department else "N/A"} for r in Researcher.objects.select_related('department').all()]
        return Response({"nodes": nodes, "edges": []})

class DashboardViewSet(viewsets.ViewSet):
    @extend_schema(responses={200: DashboardStatsSerializer})
    @action(detail=False, methods=["get"], url_path="general-stats")
    def general_stats(self, request):
        return Response({"total_researchers": Researcher.objects.count(), "total_projects": Project.objects.count(), "total_publications": Publication.objects.count()})

    @action(detail=False, methods=["get"], url_path="department-distribution")
    def department_distribution(self, request):
        qs = Department.objects.annotate(researcher_count=Count("researchers")).values("name", "researcher_count").order_by("-researcher_count")
        return Response([{"department": r["name"], "researcher_count": r["researcher_count"]} for r in qs])

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]