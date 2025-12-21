# core/views.py

from django.db import connection, transaction # connection artık sadece transaction için kalabilir ama orijinalde vardı, kalsın.
from django.utils import timezone
from django.db.models import Count, Sum, Q, F # ORM için gerekli importlar eklendi
from django.contrib.auth.models import User

# --- REST FRAMEWORK IMPORTLARI ---
from rest_framework import viewsets, status, filters, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

# Modeller
from .models import (
    Department, Researcher, Project, Publication,
    FundingAgency, FundingAgencyGrant, Tag, EntityTag,
    Skill, ResearcherSkill, ProjectResearcher,
    AuthorPublication, CollaborationRequest, Notification
)

# Serializerlar
from .serializers import (
    DepartmentSerializer, ResearcherSerializer, ProjectSerializer,
    PublicationSerializer, FundingAgencySerializer, FundingAgencyGrantSerializer,
    TagSerializer, EntityTagSerializer, SkillSerializer,
    ResearcherOnboardSerializer, AddResearcherToProjectSerializer,  
    SendCollaborationRequestSerializer, RespondCollaborationRequestSerializer,
    NetworkGraphSerializer, DashboardStatsSerializer, RegisterSerializer
)

# Servisler ve İzinler
from .services import get_collaboration_suggestions, generate_embedding, analyze_skills_with_gemini
from .permissions import IsAcademicianOrReadOnly, IsResearcherOwnerOrReadOnly

import itertools # Network kenarları için ORM çözümünde lazım olacak

# -------------------------
#  Basit CRUD ViewSet'ler (HEPSİ GERİ GELDİ)
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

    # ORM Dönüşümü Yapıldı
    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """
        /api/funding-agencies/{id}/projects
        Bu kurumun fonladığı projeleri listeler. (ORM Dönüşümü)
        """
        funding_agency_id = pk
        # FundingAgencyGrant üzerinden ilişkili projeleri çekiyoruz
        projects = Project.objects.filter(
            funding_grants__funding_agency_id=funding_agency_id
        ).distinct().values('project_id', 'title', 'status').order_by('project_id')

        return Response(list(projects))

class FundingAgencyGrantViewSet(viewsets.ModelViewSet):
    queryset = FundingAgencyGrant.objects.all().order_by('grant_id')
    serializer_class = FundingAgencyGrantSerializer

# -------------------------
#  ANA VIEWSETLER
# -------------------------

class ResearcherViewSet(viewsets.ModelViewSet):
    queryset = Researcher.objects.all().order_by('researcher_id')
    serializer_class = ResearcherSerializer
    
    # --- GÜVENLİK VE İZİNLER ---
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        Özel İzin Ayarları:
        """
        if self.action == 'onboard':
            return [AllowAny()]
        # respond_request için IsAuthenticated zaten sınıf seviyesinde var ama yine de açıkça belirtelim
        if self.action == 'respond_request':
             return [IsAuthenticated()]
        return super().get_permissions()

    # --- FİLTRELEME AYARLARI ---
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'department': ['exact'],
        'title': ['icontains'],
        'email': ['icontains'],
        'full_name': ['icontains'],
    }
    search_fields = ['full_name', 'email', 'bio']
    ordering_fields = ['full_name', 'created_at']

    # =========================================================================
    # 0. ME (Kendi Profilim)
    # =========================================================================
    @extend_schema(
        summary="Giriş Yapan Kullanıcının Profili",
        description="Token sahibinin Researcher profilini döner veya günceller.",
        responses={200: ResearcherSerializer}
    )
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated], url_path='me')
    def me(self, request):
        try:
            researcher = Researcher.objects.get(user=request.user)
            if request.method == 'PATCH':
                serializer = self.get_serializer(researcher, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data)
            
            serializer = self.get_serializer(researcher)
            return Response(serializer.data)
        except Researcher.DoesNotExist:
            return Response({"detail": "Profil bulunamadı."}, status=404)

    # ... (perform_update metodu aynen kalıyor) ...
    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.bio:
            try:
                dept_name = instance.department.name if instance.department else "General Academic"
                instance.skills = analyze_skills_with_gemini(instance.bio, dept_name)
                semantic_text = f"{instance.title or ''} {instance.bio}"
                instance.embedding = generate_embedding(semantic_text)
                instance.save()
            except Exception as e:
                print(f"⚠️ AI İşleme Hatası (Update): {str(e)}")

    # =========================================================================
    # 1. ONBOARD
    # =========================================================================
    @extend_schema(
        request=ResearcherOnboardSerializer,
        responses={201: ResearcherSerializer},
        summary="Kayıt + Login Hesabı + Branş Odaklı AI Analizi",
        description="User ve Researcher profili oluşturur, branşa göre yetenekleri ayıklar."
    )
    @action(detail=False, methods=['post'], url_path='onboard', permission_classes=[AllowAny])
    def onboard(self, request):
        serializer = ResearcherOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                if User.objects.filter(username=data['email']).exists():
                    return Response({"detail": "Bu email ile kayıtlı bir kullanıcı zaten var."}, status=400)

                user = User.objects.create_user(
                    username=data['email'], email=data['email'], password=data['password']
                )

                new_researcher = Researcher.objects.create(
                    user=user, full_name=data['full_name'], email=data['email'],
                    department_id=data['department_id'], title=data.get('title', ''),
                    bio=data.get('bio', ''), role=data.get('role', 'student'),
                )

                # AI ANALİZİ
                dept_name = new_researcher.department.name if new_researcher.department else "General Academic"
                if new_researcher.bio:
                    try:
                        new_researcher.skills = analyze_skills_with_gemini(new_researcher.bio, dept_name)
                    except Exception as ai_err:
                        print(f"⚠️ Gemini Skill Extraction Hatası: {ai_err}")
                        new_researcher.skills = {}

                semantic_text = f"{new_researcher.title or ''}. {new_researcher.bio or ''}"
                new_researcher.embedding = generate_embedding(semantic_text or new_researcher.full_name)
                new_researcher.save()

                # Opsiyonel Proje Oluşturma
                project_data = data.get('create_project')
                if project_data:
                    created_project = Project.objects.create(
                        title=project_data.get('title'), summary=project_data.get('summary', ''),
                        status=project_data.get('status', 'active'), pi=new_researcher,
                        department_id=data['department_id']
                    )
                    ProjectResearcher.objects.create(
                        project=created_project, researcher=new_researcher,
                        role="Principal Investigator", joined_at=timezone.now()
                    )
                    proj_text = f"{created_project.title} {created_project.summary}"
                    created_project.embedding = generate_embedding(proj_text)
                    created_project.save()

            suggestions = get_collaboration_suggestions(new_researcher.researcher_id, limit=5)
            return Response({
                "message": "Kayıt ve AI analizi başarıyla tamamlandı.",
                "login_email": user.email,
                "new_researcher": {"id": new_researcher.researcher_id, "name": new_researcher.full_name},
                "collaboration_suggestions": suggestions
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # =========================================================================
    # 2. İŞBİRLİĞİ İSTEĞİ GÖNDERME
    # =========================================================================
    @extend_schema(
        request=SendCollaborationRequestSerializer,
        summary="İşbirliği İsteği Gönder",
        description="İstek gönderir ve oluşturulan isteğin ID'sini döner."
    )
    @action(detail=True, methods=['post'], url_path='send-request', permission_classes=[IsAuthenticated])
    def send_request(self, request, pk=None):
        receiver = self.get_object() 
        sender = request.user.researcher 
        serializer = SendCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        try:
            project = Project.objects.get(pk=data['project_id'])
            if sender == receiver: return Response({"detail": "Kendi kendine iş birliği teklifi fırlatamazsın!"}, status=400)
            if CollaborationRequest.objects.filter(sender=sender, receiver=receiver, project=project, status='pending').exists():
                return Response({"detail": "Bu proje için zaten bekleyen bir isteğin var."}, status=400)

            collab_req = CollaborationRequest.objects.create(
                sender=sender, receiver=receiver, project=project,
                request_type=data['request_type'], message=data.get('message', '')
            )
            return Response({"detail": "İstek fırlatıldı.", "request_id": collab_req.request_id, "status": collab_req.status}, status=status.HTTP_201_CREATED)
        except Project.DoesNotExist: return Response({"detail": "Proje bulunamadı."}, status=404)
        except Exception as e: return Response({"detail": str(e)}, status=400)

    # =========================================================================
    # 3. İSTEĞİ CEVAPLAMA (GÜNCELLENMİŞ VE ORM MANTIKLI)
    # =========================================================================
    @extend_schema(
        request=RespondCollaborationRequestSerializer,
        summary="İsteği Cevapla",
        description="Gelen isteği kabul/red eder ve ilgili bildirimi okundu olarak işaretler."
    )
    @action(detail=False, methods=['post'], url_path='respond-request', permission_classes=[IsAuthenticated])
    def respond_request(self, request):
        # Frontend ile uyumlu serializer kullanımı
        serializer = RespondCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        req_id = data['request_id']
        response_status = data['status'] # 'status' anahtarı
        response_msg = data.get('response_message', '') # 'response_message' anahtarı
        
        try:
            with transaction.atomic():
                # ORM ile isteği çekiyoruz
                collab_req = CollaborationRequest.objects.select_related('project', 'sender', 'receiver').get(request_id=req_id)
                
                # Sadece bekleyen istekler cevaplanabilir
                if collab_req.status not in ['pending', 'Beklemede']:
                    return Response({"detail": "Bu istek daha önce cevaplanmış."}, status=400)

                # Durumu güncelle
                collab_req.status = response_status
                collab_req.response_message = response_msg
                collab_req.save()

                result_data = {"detail": f"İstek {response_status} olarak işaretlendi.", "status": response_status}

                # Kabul edildiyse projeye ekle (ORM ile)
                if response_status == 'accepted':
                    role = "Collaborator" if collab_req.request_type == 'invite' else "Researcher"
                    new_member = collab_req.receiver if collab_req.request_type == 'invite' else collab_req.sender

                    # get_or_create ile çift kaydı önlüyoruz (ORM'in gücü)
                    ProjectResearcher.objects.get_or_create(
                        project=collab_req.project,
                        researcher=new_member,
                        defaults={'role': role, 'joined_at': timezone.now()}
                    )
                    result_data["detail"] = f"İstek kabul edildi. {new_member.full_name} projeye eklendi."

                # Bildirimi okundu yap (ORM Toplu Güncelleme)
                # İsteği alan kişinin (receiver) ilgili okunmamış bildirimlerini bul ve güncelle
                Notification.objects.filter(
                    recipient=collab_req.receiver,
                    is_read=False
                    # Burada proje veya gönderen bazlı daha spesifik bir filtre de eklenebilir
                    # ancak şimdilik en son okunmamışları kapatmak yeterli olabilir.
                    # Daha hassas bir yaklaşım için Notification modeline ilişki eklemek gerekir.
                ).update(is_read=True)

            return Response(result_data, status=200)

        except CollaborationRequest.DoesNotExist:
            return Response({"detail": "İstek bulunamadı."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)

    # =========================================================================
    # MEVCUT GET METODLARI (ORM DÖNÜŞÜMÜ YAPILDI)
    # =========================================================================
    @action(detail=True, methods=['get'], url_path='collaboration-suggestions')
    def collaboration_suggestions(self, request, pk=None):
        try: base_researcher_id = int(pk)
        except (TypeError, ValueError): return Response({"detail": "Geçersiz ID."}, status=400)
        limit = int(request.query_params.get('limit', 10))
        suggestions = get_collaboration_suggestions(base_researcher_id, limit=max(1, min(limit, 50)))
        return Response(suggestions)
    
    # ORM Dönüşümü Yapıldı
    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        researcher_id = pk
        # ProjectResearcher üzerinden ilişkili projeleri çekiyoruz
        projects = Project.objects.filter(
            memberships__researcher_id=researcher_id
        ).values('project_id', 'title', 'status', 'start_date', 'end_date').order_by('project_id')
        
        return Response(list(projects))

    # ORM Dönüşümü Yapıldı
    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        researcher_id = pk
        # ResearcherSkill üzerinden yetenekleri ve seviyeleri çekiyoruz
        skills = ResearcherSkill.objects.filter(
            researcher_id=researcher_id
        ).select_related('skill').values(
            skill_id=F('skill__skill_id'),
            name=F('skill__name'),
            level=F('level')
        ).order_by('skill__name')

        return Response(list(skills))

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('project_id')
    serializer_class = ProjectSerializer
    permission_classes = [IsAcademicianOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'department': ['exact'], 'pi': ['exact'],
        'status': ['icontains'], 'title': ['icontains'],
    }
    search_fields = ['title', 'summary']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    # ORM Dönüşümü Yapıldı
    @action(detail=True, methods=['get'])
    def researchers(self, request, pk=None):
        """
        Projede görev alan araştırmacıları getirir. (ORM Dönüşümü)
        """
        project_id = pk
        members = ProjectResearcher.objects.filter(
            project_id=project_id
        ).select_related('researcher').order_by('researcher__full_name')

        data = []
        for m in members:
            data.append({
                "researcher_id": m.researcher.researcher_id,
                "full_name": m.researcher.full_name,
                "email": m.researcher.email,
                "role": m.role,
                "contribution_pct": float(m.contribution_pct) if m.contribution_pct else None,
                "joined_at": m.joined_at,
            })
        return Response(data)

    @extend_schema(
        request=AddResearcherToProjectSerializer,
        responses={201: None},
        summary="Projeye Araştırmacı Ekle",
        description="Mevcut bir projeye, veritabanındaki bir araştırmacıyı atar."
    )
    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        project_id = pk
        # Manuel validasyon orijinal koddaki gibi bırakıldı (istenirse serializer kullanılabilir)
        researcher_id = request.data.get("researcher_id")
        role = request.data.get("role", "Researcher")
        contribution_pct = request.data.get("contribution_pct")
        joined_at = request.data.get("joined_at", timezone.now())

        if not researcher_id:
            return Response({"detail": "researcher_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # ORM ile kayıt oluşturma (get_or_create ile güncelleme veya ekleme yapılabilir, burada create kullanıyoruz)
            ProjectResearcher.objects.create(
                project_id=project_id,
                researcher_id=researcher_id,
                role=role,
                contribution_pct=contribution_pct,
                joined_at=joined_at
            )
            return Response({"detail": "Araştırmacı projeye eklendi."}, status=status.HTTP_201_CREATED)
        except Exception as e:
             # Olası bir IntegrityError (örn: zaten ekliyse) veya başka bir hatayı yakalamak için
             return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        project = self.get_object()
        grants = project.funding_grants.select_related('funding_agency').all()
        serializer = FundingAgencyGrantSerializer(grants, many=True)
        return Response(serializer.data)

class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all().order_by('publication_id')
    serializer_class = PublicationSerializer

    # ORM Dönüşümü Yapıldı
    @action(detail=True, methods=['get'])
    def authors(self, request, pk=None):
        """
        Yazar listesini getirir. (ORM Dönüşümü)
        """
        publication_id = pk
        authors = AuthorPublication.objects.filter(
            publication_id=publication_id
        ).select_related('researcher').order_by('author_order')

        data = []
        for a in authors:
            data.append({
                "researcher_id": a.researcher.researcher_id,
                "full_name": a.researcher.full_name,
                "email": a.researcher.email,
                "author_order": a.author_order,
            })
        return Response(data)

# -------------------------
#  Network / İlişki Ağı API (ORM DÖNÜŞÜMÜ)
# -------------------------

class NetworkViewSet(viewsets.ViewSet):
    @extend_schema(
        summary="İşbirliği Ağı",
        responses={200: NetworkGraphSerializer}
    )
    def list(self, request):
        nodes = []
        edges = []
        
        # 1. NODES (Düğümler) - ORM
        researchers = Researcher.objects.select_related('department').all()
        for r in researchers:
            nodes.append({
                "id": r.researcher_id,
                "label": r.full_name,
                "group": r.department.name if r.department else "Unknown",
                "title": r.title
            })

        # 2. EDGES - PROJE İLİŞKİLERİ (ORM - Itertools ile)
        # Karmaşık self-join yerine Python tarafında işleme (Strict ORM kuralı nedeniyle)
        project_edges_data = {}
        # prefetch_related ile N+1 sorununu çözüyoruz
        projects = Project.objects.prefetch_related('memberships__researcher')
        for project in projects:
            # Projedeki araştırmacıların ID'lerini alıp sıralıyoruz
            researcher_ids = sorted([m.researcher.researcher_id for m in project.memberships.all()])
            # İkili kombinasyonlarını buluyoruz (Ali-Ayşe ilişkisi)
            for r1_id, r2_id in itertools.combinations(researcher_ids, 2):
                key = (r1_id, r2_id)
                project_edges_data[key] = project_edges_data.get(key, 0) + 1

        for (source, target), weight in project_edges_data.items():
             edges.append({"from": source, "to": target, "value": weight, "type": "project"})

        # 3. EDGES - YAYIN İLİŞKİLERİ (ORM - Itertools ile)
        pub_edges_data = {}
        publications = Publication.objects.prefetch_related('authorships__researcher')
        for pub in publications:
            researcher_ids = sorted([a.researcher.researcher_id for a in pub.authorships.all()])
            for r1_id, r2_id in itertools.combinations(researcher_ids, 2):
                key = (r1_id, r2_id)
                pub_edges_data[key] = pub_edges_data.get(key, 0) + 1
        
        for (source, target), weight in pub_edges_data.items():
             edges.append({"from": source, "to": target, "value": weight, "type": "publication"})

        return Response({"nodes": nodes, "edges": edges})

# -------------------------
#  Dashboard / İstatistik API
# -------------------------

class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    @extend_schema(responses={200: DashboardStatsSerializer})
    @action(detail=False, methods=["get"], url_path="general-stats")
    def general_stats(self, request):
        # ORM count() zaten kullanılıyordu, aynen devam
        data = {
            "total_researchers": Researcher.objects.count(),
            "total_projects": Project.objects.count(),
            "total_publications": Publication.objects.count(),
        }
        return Response(data)

    # ORM Dönüşümü Yapıldı
    @action(detail=False, methods=["get"], url_path="department-distribution")
    def department_distribution(self, request):
        # related_name='researchers' kullanılarak annotate edildi
        qs = Department.objects.annotate(
            researcher_count=Count("researchers")
        ).values("name", "researcher_count").order_by("-researcher_count", "name")

        data = [{"department": row["name"], "researcher_count": row["researcher_count"]} for row in qs]
        return Response(data)

    # ORM Dönüşümü Yapıldı
    @action(detail=False, methods=["get"], url_path="top-skills")
    def top_skills(self, request):
        # related_name='researcher_skills' kullanılarak yetenek bazlı sayım
        qs = Skill.objects.annotate(
            researcher_count=Count("researcher_skills", distinct=True)
        ).values("name", "researcher_count").order_by("-researcher_count", "name")

        data = [{"skill": row["name"], "researcher_count": row["researcher_count"]} for row in qs]
        return Response(data)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer