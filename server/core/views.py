from django.db import connection, transaction
from django.utils import timezone
from django.db.models import Count, Sum
from django.contrib.auth.models import User # <-- User modelini unutma


# --- REST FRAMEWORK IMPORTLARI (DÜZELTİLEN KISIM) ---
from rest_framework import viewsets, status, filters, permissions, generics # <-- 'generics' EKLENDİ!
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from .models import *
from .serializers import *

# Servisler ve İzinler
from .services import get_collaboration_suggestions, generate_embedding, analyze_skills_with_gemini
from .permissions import IsAcademicianOrReadOnly, IsResearcherOwnerOrReadOnly

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
    NetworkGraphSerializer, DashboardStatsSerializer, RegisterSerializer # <-- RegisterSerializer burada olmalı
)
# -------------------------
#  Basit CRUD ViewSet'ler
# -------------------------

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]




class ResearcherViewSet(viewsets.ModelViewSet):
    queryset = Researcher.objects.all().order_by('researcher_id')
    serializer_class = ResearcherSerializer
    
    # --- GÜVENLİK VE İZİNLER ---
    permission_classes = [IsResearcherOwnerOrReadOnly]

    # =========================================================================
    # 0. ME (Kendi Profilim) - EKLENEN KISIM
    # =========================================================================
    @extend_schema(
        summary="Giriş Yapan Kullanıcının Profili",
        description="Token sahibinin Researcher profilini döner.",
        responses={200: ResearcherSerializer}
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='me')
    def me(self, request):
        """
        GET /api/researchers/me/
        Token header'da varsa, o kullanıcıya bağlı researcher profilini döner.
        """
        try:
            # Token'dan gelen user'a bağlı researcher'ı bul
            researcher = Researcher.objects.get(user=request.user)
            serializer = self.get_serializer(researcher)
            return Response(serializer.data)
        except Researcher.DoesNotExist:
            return Response(
                {"detail": "Bu kullanıcıya bağlı bir araştırmacı profili bulunamadı."}, 
                status=404
            )

    # views.py - ResearcherViewSet içine ekle
    def perform_update(self, serializer):
        """
        Profil güncellendiğinde (PATCH/PUT) otomatik çalışır.
        """
        # 1. Önce normal kayıt işlemini yap (bio, title vb. veritabanına yazılsın)
        instance = serializer.save()

        # 2. AI GÜNCELLEMESİ (Embedding + Skill Extraction)
        if instance.bio:
            try:
                # KRİTİK DÜZELTME: Bölüm ismini modelden çekiyoruz
                # Eğer bölüm atanmamışsa "General Academic" varsayılanını kullanıyoruz.
                dept_name = instance.department.name if instance.department else "General Academic"
                
                # Fonksiyonu artık iki parametreyle çağırıyoruz: (metin, branş)
                instance.skills = analyze_skills_with_gemini(instance.bio, dept_name)
                
                # Semantic Search vektörünü de güncel tutalım
                semantic_text = f"{instance.title or ''} {instance.bio}"
                instance.embedding = generate_embedding(semantic_text)
                
                # AI sonuçlarını veritabanına mühürle
                instance.save()
                
            except Exception as e:
                # Render loglarında bu hatayı net görebilmek için:
                print(f"⚠️ AI İşleme Hatası (Update): {str(e)}")


    def get_permissions(self):
        """
        Özel İzin Ayarları:
        - onboard: Herkese açık (AllowAny).
        - respond_request: Giriş yapmış herkes (IsAuthenticated).
        - diğerleri: Varsayılan (Sadece kendi profilini düzenleyebilir).
        """
        if self.action == 'onboard':
            return [AllowAny()]
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
    # 1. ONBOARD (Kayıt + Opsiyonel Proje Oluşturma)
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
                # ---------------------------------------------------------
                # ADIM 1: Django User Oluştur (Güvenlik Kapısı) 🔑
                # ---------------------------------------------------------
                if User.objects.filter(username=data['email']).exists():
                    return Response({"detail": "Bu email ile kayıtlı bir kullanıcı zaten var."}, status=400)

                user = User.objects.create_user(
                    username=data['email'], 
                    email=data['email'], 
                    password=data['password']
                )

                # ---------------------------------------------------------
                # ADIM 2: Araştırmacı Profilini Oluştur 🔗
                # ---------------------------------------------------------
                new_researcher = Researcher.objects.create(
                    user=user,
                    full_name=data['full_name'],
                    email=data['email'],
                    department_id=data['department_id'],
                    title=data.get('title', ''),
                    bio=data.get('bio', ''),
                    role=data.get('role', 'student'),
                )

                # ---------------------------------------------------------
                # ADIM 3: AI ANALİZİ (Branşa Göre Yetenek Ayıklama) 🧠
                # ---------------------------------------------------------
                # Branş ismini çekiyoruz (Genel vizyon için kritik!)
                dept_name = new_researcher.department.name if new_researcher.department else "General Academic"
                
                if new_researcher.bio:
                    try:
                        # Artık AI'ya "Hangi gözle bakması gerektiğini" söylüyoruz
                        new_researcher.skills = analyze_skills_with_gemini(new_researcher.bio, dept_name)
                    except Exception as ai_err:
                        print(f"⚠️ Gemini Skill Extraction Hatası: {ai_err}")
                        new_researcher.skills = {}

                # Semantic Search için Vektör Oluşturma (ORM Kullanımı - RAW SQL DEĞİL!)
                semantic_text = f"{new_researcher.title or ''}. {new_researcher.bio or ''}"
                new_researcher.embedding = generate_embedding(semantic_text or new_researcher.full_name)
                
                # Tüm AI verilerini veritabanına mühürle
                new_researcher.save()

                # ---------------------------------------------------------
                # ADIM 4: Opsiyonel Proje Oluşturma 🏗️
                # ---------------------------------------------------------
                created_project = None
                project_data = data.get('create_project')
                
                if project_data:
                    created_project = Project.objects.create(
                        title=project_data.get('title'),
                        summary=project_data.get('summary', ''),
                        status=project_data.get('status', 'active'),
                        pi=new_researcher,
                        department_id=data['department_id']
                    )
                    
                    # Projeye PI (Baş Araştırmacı) olarak ekle
                    ProjectResearcher.objects.create(
                        project=created_project,
                        researcher=new_researcher,
                        role="Principal Investigator",
                        joined_at=timezone.now()
                    )

                    # Proje vektörünü de hesapla
                    proj_text = f"{created_project.title} {created_project.summary}"
                    created_project.embedding = generate_embedding(proj_text)
                    created_project.save()

            # ---------------------------------------------------------
            # ADIM 5: Başarılı Yanıt ve Öneriler
            # ---------------------------------------------------------
            suggestions = get_collaboration_suggestions(new_researcher.researcher_id, limit=5)

            return Response({
                "message": "Kayıt ve AI analizi başarıyla tamamlandı.",
                "login_email": user.email,
                "new_researcher": {
                    "id": new_researcher.researcher_id,
                    "name": new_researcher.full_name,
                    "skills_count": len(new_researcher.skills) if new_researcher.skills else 0,
                    "department": dept_name
                },
                "collaboration_suggestions": suggestions
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Hata durumunda transaction.atomic sayesinde her şey geri alınır
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # =========================================================================
    # 2. İŞBİRLİĞİ İSTEĞİ GÖNDERME (Invite / Join Request)
    # =========================================================================
    # core/views.py içinde send_request fonksiyonunu bul ve değiştir:

    @extend_schema(
        request=SendCollaborationRequestSerializer,
        summary="İşbirliği İsteği Gönder",
        description="İstek gönderir ve oluşturulan isteğin ID'sini döner."
    )
    @action(detail=True, methods=['post'], url_path='send-request')
    def send_request(self, request, pk=None):
        sender_id = pk
        serializer = SendCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        try:
            sender = Researcher.objects.get(pk=sender_id)
            receiver = Researcher.objects.get(pk=data['receiver_id'])
            project = Project.objects.get(pk=data['project_id'])

            if CollaborationRequest.objects.filter(
                sender=sender, receiver=receiver, project=project, status='pending'
            ).exists():
                return Response({"detail": "Zaten bekleyen bir istek var."}, status=400)

            # İsteği oluştur ve değişkene ata
            collab_req = CollaborationRequest.objects.create(
                sender=sender,
                receiver=receiver,
                project=project,
                request_type=data['request_type'],
                message=data.get('message', '')
            )
            
            # CEVAPTA ID'Yİ DÖNÜYORUZ (ARTIK ADMİN PANELİNE GEREK YOK)
            return Response({
                "detail": "İşbirliği isteği başarıyla gönderildi.",
                "request_id": collab_req.request_id,  # <-- İşte aradığın ID
                "status": collab_req.status
            }, status=status.HTTP_201_CREATED)

        except Researcher.DoesNotExist:
            return Response({"detail": "Araştırmacı bulunamadı."}, status=404)
        except Project.DoesNotExist:
            return Response({"detail": "Proje bulunamadı."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    # =========================================================================
    # 3. İSTEĞİ CEVAPLAMA (Accept / Reject)
    # =========================================================================
    
    @extend_schema(
        request=RespondCollaborationRequestSerializer,
        summary="İsteği Cevapla",
        description="Gelen isteği kabul/red eder ve ilgili bildirimi okundu olarak işaretler."
    )
    @action(detail=False, methods=['post'], url_path='respond-request')
    def respond_request(self, request):
        serializer = RespondCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        req_id = data['request_id']
        response_status = data['response']
        response_msg = data.get('message', '')
        
        try:
            with transaction.atomic():
                # İlgili isteği çek
                collab_req = CollaborationRequest.objects.select_related('project', 'sender', 'receiver').get(request_id=req_id)
                
                if collab_req.status != 'pending':
                    return Response({"detail": "Bu istek daha önce cevaplanmış."}, status=400)

                # 1. Durumu ve Cevap Mesajını Güncelle
                collab_req.status = response_status
                collab_req.response_message = response_msg
                collab_req.save()

                result_data = {
                    "detail": f"İstek {response_status} olarak işaretlendi.",
                    "request_id": req_id,
                    "status": response_status,
                    "response_message": response_msg
                }

                # 2. Eğer KABUL edildiyse, projeye ekle
                if response_status == 'accepted':
                    role = "Collaborator" if collab_req.request_type == 'invite' else "Researcher"
                    # İsteğin yönüne göre projeye eklenecek kişiyi seç
                    new_member = collab_req.receiver if collab_req.request_type == 'invite' else collab_req.sender

                    # Çift kayıt olmaması için kontrol et
                    if not ProjectResearcher.objects.filter(project=collab_req.project, researcher=new_member).exists():
                        pr_obj = ProjectResearcher.objects.create(
                            project=collab_req.project,
                            researcher=new_member,
                            role=role,
                            joined_at=timezone.now()
                        )
                        result_data["project_membership_id"] = pr_obj.id
                    
                    result_data["detail"] = f"İstek kabul edildi. {new_member.full_name} projeye eklendi."

                # 3. BİLDİRİMİ OKUNDU YAP (PROFESYONEL DÜZELTME) 🧹
                # Hata Çözümü 1: 'request.user' yerine 'collab_req.receiver' (Researcher profili) kullanıldı.
                # Hata Çözümü 2: '.id' yerine '.pk' kullanıldı (Notification modelindeki ID isminden bağımsız çalışır).
                
                notification_owner = collab_req.receiver 
                
                if notification_owner:
                    unread_notif = Notification.objects.filter(
                        recipient=notification_owner,
                        is_read=False
                    ).order_by('-created_at').first()

                    if unread_notif:
                        unread_notif.is_read = True
                        unread_notif.save()
                        
                        # BURASI DEĞİŞTİ: .id YERİNE .pk KULLANILDI 👇
                        result_data["notification_updated"] = f"Bildirim (ID: {unread_notif.pk}) okundu yapıldı."

            return Response(result_data, status=200)

        except CollaborationRequest.DoesNotExist:
            return Response({"detail": "İstek bulunamadı."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)
    # =========================================================================
    # MEVCUT GET METODLARI (Aynen korundu)
    # =========================================================================

    @action(detail=True, methods=['get'], url_path='collaboration-suggestions')
    def collaboration_suggestions(self, request, pk=None):
        try:
            base_researcher_id = int(pk)
        except (TypeError, ValueError):
            return Response({"detail": "Geçersiz researcher id."}, status=400)

        limit = int(request.query_params.get('limit', 10))
        limit = max(1, min(limit, 50))

        suggestions = get_collaboration_suggestions(base_researcher_id, limit=limit)
        return Response(suggestions)
    
    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        researcher_id = pk
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT p.project_id, p.title, p.status, p.start_date, p.end_date
                FROM project_researcher pr
                JOIN project p ON p.project_id = pr.project_id
                WHERE pr.researcher_id = %s
                ORDER BY p.project_id;
            """, [researcher_id])
            rows = cursor.fetchall()

        data = [{"project_id": r[0], "title": r[1], "status": r[2], "start_date": r[3], "end_date": r[4]} for r in rows]
        return Response(data)

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        researcher_id = pk
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT s.skill_id, s.name, rs.level
                FROM researcher_skill rs
                JOIN skill s ON s.skill_id = rs.skill_id
                WHERE rs.researcher_id = %s
                ORDER BY s.name;
            """, [researcher_id])
            rows = cursor.fetchall()

        data = [{"skill_id": r[0], "name": r[1], "level": r[2]} for r in rows]
        return Response(data)

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('project_id')
    serializer_class = ProjectSerializer
    # --- GÜVENLİK DUVARI BURADA ---
    # IsAcademicianOrReadOnly: Sadece hocalar proje ekleyebilir/silebilir.
    permission_classes = [IsAcademicianOrReadOnly] 
    # ------------------------------

    
    # --- YENİ EKLENEN KISIM ---
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # --- GÜNCELLENMİŞ KISIM ---
    filterset_fields = {
        'department': ['exact'],
        'pi': ['exact'],
        'status': ['icontains'],       # "act" yazınca "active" gelsin
        'title': ['icontains'],        # Başlıkta geçen kelimeye göre filtrele
    }
    # --------------------------
    
    search_fields = ['title', 'summary']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    @action(detail=True, methods=['get'])
    def researchers(self, request, pk=None):
        """
        /api/projects/{id}/researchers
        Projede görev alan araştırmacıları, rolleriyle birlikte getirir.
        (project_researcher + researcher join)
        """
        project_id = pk

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.researcher_id,
                    r.full_name,
                    r.email,
                    pr.role,
                    pr.contribution_pct,
                    pr.joined_at
                FROM project_researcher pr
                JOIN researcher r
                    ON r.researcher_id = pr.researcher_id
                WHERE pr.project_id = %s
                ORDER BY r.full_name;
            """, [project_id])
            rows = cursor.fetchall()

        data = [
            {
                "researcher_id": row[0],
                "full_name": row[1],
                "email": row[2],
                "role": row[3],
                "contribution_pct": float(row[4]) if row[4] is not None else None,
                "joined_at": row[5],
            }
            for row in rows
        ]
        return Response(data)

    # core/views.py içinde ProjectViewSet altında:

    @extend_schema(
        request=AddResearcherToProjectSerializer,  # <-- Swagger'a Input formatını gösterdik
        responses={201: None},
        summary="Projeye Araştırmacı Ekle",
        description="Mevcut bir projeye, veritabanındaki bir araştırmacıyı atar."
    )
    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        """
        POST /api/projects/{id}/researchers
        """
        project_id = pk
        # ... (Kodun geri kalanı aynı, dokunmana gerek yok) ...
        researcher_id = request.data.get("researcher_id")
        role = request.data.get("role")
        contribution_pct = request.data.get("contribution_pct")
        joined_at = request.data.get("joined_at")

        if not researcher_id:
            return Response(
                {"detail": "researcher_id gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            contribution_val = float(contribution_pct) if contribution_pct is not None else None
        except ValueError:
            return Response(
                {"detail": "contribution_pct sayısal olmalı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO project_researcher
                    (project_id, researcher_id, role, contribution_pct, joined_at)
                VALUES (%s, %s, %s, %s, %s);
            """, [project_id, researcher_id, role, contribution_val, joined_at])

        return Response({"detail": "Araştırmacı projeye eklendi."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        """
        /api/projects/{id}/funding
        Bu projeye ait fon kayıtlarını (grant'leri) getirir.
        ORM kullandık.
        """
        project = self.get_object()
        grants = project.funding_grants.select_related('funding_agency').all()
        serializer = FundingAgencyGrantSerializer(grants, many=True)
        return Response(serializer.data)


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all().order_by('publication_id')
    serializer_class = PublicationSerializer

    @action(detail=True, methods=['get'])
    def authors(self, request, pk=None):
        """
        /api/publications/{id}/authors
        author_publication + researcher join ile yazar listesini getirir.
        """
        publication_id = pk

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.researcher_id,
                    r.full_name,
                    r.email,
                    ap.author_order
                FROM author_publication ap
                JOIN researcher r
                    ON r.researcher_id = ap.researcher_id
                WHERE ap.publication_id = %s
                ORDER BY ap.author_order;
            """, [publication_id])
            rows = cursor.fetchall()

        data = [
            {
                "researcher_id": row[0],
                "full_name": row[1],
                "email": row[2],
                "author_order": row[3],
            }
            for row in rows
        ]
        return Response(data)


class FundingAgencyViewSet(viewsets.ModelViewSet):
    queryset = FundingAgency.objects.all().order_by('funding_agency_id')
    serializer_class = FundingAgencySerializer

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """
        /api/funding-agencies/{id}/projects
        Bu kurumun fonladığı projeleri listeler.
        """
        funding_agency_id = pk

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT
                    p.project_id,
                    p.title,
                    p.status
                FROM funding_agency_grant fag
                JOIN project p
                    ON p.project_id = fag.project_id
                WHERE fag.funding_agency_id = %s
                ORDER BY p.project_id;
            """, [funding_agency_id])
            rows = cursor.fetchall()

        data = [
            {
                "project_id": row[0],
                "title": row[1],
                "status": row[2],
            }
            for row in rows
        ]
        return Response(data)


class FundingAgencyGrantViewSet(viewsets.ModelViewSet):
    queryset = FundingAgencyGrant.objects.all().order_by('grant_id')
    serializer_class = FundingAgencyGrantSerializer


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by('tag_id')
    serializer_class = TagSerializer


class EntityTagViewSet(viewsets.ModelViewSet):
    queryset = EntityTag.objects.all().order_by('entity_tag_id')
    serializer_class = EntityTagSerializer


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all().order_by('skill_id')
    serializer_class = SkillSerializer




# -------------------------
#  Network / İlişki Ağı API
# -------------------------

class NetworkViewSet(viewsets.ViewSet):
    """
    Araştırmacılar arasındaki ilişkileri (Graph Data) döner.
    Frontend'de (React Flow, Cytoscape.js) çizim yapmak için kullanılır.
    """
    @extend_schema(
        summary="İşbirliği Ağı",
        description="Araştırmacıları (Nodes) ve ortak proje/yayınları (Edges) getirir.",
        responses={200: NetworkGraphSerializer}
    )
    def list(self, request):
        """
        GET /api/network/
        """
        nodes = []
        edges = []
        
        # 1. NODES (Düğümler - Araştırmacılar)
        # Her araştırmacı bir düğümdür.
        researchers = Researcher.objects.select_related('department').all()
        for r in researchers:
            nodes.append({
                "id": r.researcher_id,
                "label": r.full_name,
                "group": r.department.name if r.department else "Unknown",
                "title": r.title  # Mouse ile üzerine gelince görünsün diye
            })

        # 2. EDGES - PROJE İLİŞKİLERİ
        # Aynı projede çalışanları bul (Self Join)
        # pr1.researcher_id < pr2.researcher_id koşulu, (Ali-Ayşe) ve (Ayşe-Ali) diye iki kere saymayı önler.
        project_sql = """
            SELECT pr1.researcher_id, pr2.researcher_id, COUNT(*) as weight
            FROM project_researcher pr1
            JOIN project_researcher pr2 ON pr1.project_id = pr2.project_id
            WHERE pr1.researcher_id < pr2.researcher_id
            GROUP BY pr1.researcher_id, pr2.researcher_id
        """
        
        with connection.cursor() as cursor:
            cursor.execute(project_sql)
            rows = cursor.fetchall()
            
        for row in rows:
            source, target, weight = row
            edges.append({
                "from": source,
                "to": target,
                "value": weight,   # Çizgi kalınlığı
                "type": "project"  # İlişki türü
            })

        # 3. EDGES - YAYIN İLİŞKİLERİ
        # Aynı yayında yazarlığı olanları bul
        pub_sql = """
            SELECT ap1.researcher_id, ap2.researcher_id, COUNT(*) as weight
            FROM author_publication ap1
            JOIN author_publication ap2 ON ap1.publication_id = ap2.publication_id
            WHERE ap1.researcher_id < ap2.researcher_id
            GROUP BY ap1.researcher_id, ap2.researcher_id
        """

        with connection.cursor() as cursor:
            cursor.execute(pub_sql)
            rows = cursor.fetchall()

        for row in rows:
            source, target, weight = row
            edges.append({
                "from": source,
                "to": target,
                "value": weight,       # Yayın ilişkisi daha değerliyse Frontend'de *2 yapılabilir
                "type": "publication"
            })

        return Response({
            "nodes": nodes,
            "edges": edges
        })
    

# -------------------------
#  Dashboard / İstatistik API
# -------------------------

class DashboardViewSet(viewsets.ViewSet):
    """
    Dashboard için istatistik endpoint'leri:
    - /api/dashboard/general-stats/
    - /api/dashboard/department-distribution/
    - /api/dashboard/top-skills/
    """
    permission_classes = [permissions.AllowAny]
    @extend_schema(
        summary="Genel İstatistikler",
        description="Sistemdeki toplam araştırmacı, proje ve yayın sayılarını getirir.",
        responses={200: DashboardStatsSerializer} # <--- İŞTE SWAGGER'I DÜZELTEN KISIM 🛠️
    )
    @action(detail=False, methods=["get"], url_path="general-stats")
    def general_stats(self, request):
        total_researchers = Researcher.objects.count()
        total_projects = Project.objects.count()
        total_publications = Publication.objects.count()

        data = {
            "total_researchers": total_researchers,
            "total_projects": total_projects,
            "total_publications": total_publications,
        }
        return Response(data)

    @action(detail=False, methods=["get"], url_path="department-distribution")
    def department_distribution(self, request):
        """
        Her departmandaki araştırmacı sayısını döner.
        Dönen format:
        [
          {"department": "Computer Engineering", "researcher_count": 2},
          {"department": "Electrical Eng.", "researcher_count": 1},
          ...
        ]
        """
        qs = (
            Department.objects
            .annotate(researcher_count=Count("researchers"))   # ✅ DOĞRU İLİŞKİ ADI
            .values("name", "researcher_count")
            .order_by("-researcher_count", "name")
        )

        data = [
            {
                "department": row["name"],              # test muhtemelen 'department' key'ini bekliyor
                "researcher_count": row["researcher_count"],
            }
            for row in qs
        ]
        return Response(data)

    @action(detail=False, methods=["get"], url_path="top-skills")
    def top_skills(self, request):
        """
        En çok kullanılan skill'leri döner.
        [
          {"skill": "UAV", "researcher_count": 3},
          {"skill": "Forest Fire Detection", "researcher_count": 2},
          ...
        ]
        """
        qs = (
            ResearcherSkill.objects
            .values("skill__name")
            .annotate(researcher_count=Count("researcher_id", distinct=True))
            .order_by("-researcher_count", "skill__name")
        )

        data = [
            {
                "skill": row["skill__name"],
                "researcher_count": row["researcher_count"],
            }
            for row in qs
        ]
        return Response(data)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # <-- ÖNEMLİ: Giriş yapmayanlar da erişebilsin
    serializer_class = RegisterSerializer