# core/views.py
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q, F
from django.contrib.auth.models import User
import itertools # Network ilişkileri için
from django.db.models import F
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

    def _trigger_ai_analysis(self, instance, old_bio, validated_data):
        """
        🛡️ KRİTİK MÜHÜR: Tüm ağır işlemleri (AI + Öneriler) buraya hapsediyoruz.
        Sadece biyografi değiştiğinde çalışır.
        """
        new_bio = validated_data.get('bio')
        
        # 1. Kontrol: Biyografi aynıysa veya boşsa işlem yapma
        if not new_bio or new_bio == old_bio:
            print(f"ℹ️ AI ve Öneriler Atlandı: Biyografi aynı. ({instance.full_name})", flush=True)
            return

        try:
            dept_name = instance.department.name if instance.department else "General Academic"
            
            # 🧠 1. Adım: Gemini Skill Extraction (10-12 saniye sürer)
            ai_data, raw_debug = analyze_skills_with_gemini(new_bio, dept_name)
            
            # Veri Formatı Kontrolü (Dizi/Obje karmaşasını mühürle)
            final_skills = {}
            if isinstance(ai_data, list) and len(ai_data) > 0:
                for item in ai_data:
                    if isinstance(item, dict): final_skills.update(item)
            elif isinstance(ai_data, dict):
                final_skills = ai_data

            instance.skills = final_skills if final_skills else {"DEBUG_RAW": str(raw_debug)[:200]}
            
            # 🗄️ ResearcherSkill modellerini otonom güncelle
            ResearcherSkill.objects.filter(researcher=instance).delete()
            if final_skills:
                for s_name, s_level in final_skills.items():
                    skill_obj, _ = Skill.objects.get_or_create(name=str(s_name)[:100])
                    try:
                        level_int = int(s_level)
                    except (ValueError, TypeError):
                        level_int = 50
                    ResearcherSkill.objects.create(researcher=instance, skill=skill_obj, level=level_int)

            # 🚀 2. Adım: Embedding Üretimi (Ağır İşlem)
            user_skills = ResearcherSkill.objects.filter(researcher=instance).select_related('skill')
            skill_weights = ", ".join([f"{s.skill.name}:{s.level}" for s in user_skills])
            semantic_text = f"{instance.title}. {new_bio}. Skills: {skill_weights}"
            instance.embedding = generate_embedding(semantic_text)
            
            # 🛰️ 3. Adım: Partner Önerilerini HESAPLA ve MÜHÜRLE (N+1 Sorgu Yükü Buraya Taşındı)
            # Artık bu fonksiyon Dashboard açıldığında değil, sadece BURADA çalışacak.
            instance.suggestions_json = get_collaboration_suggestions(instance.researcher_id, limit=5)
            
            # Tüm ağır verileri tek bir seferde veritabanına mühürle
            instance.save(update_fields=['skills', 'embedding', 'suggestions_json'])
            print(f"✅ AI Analizi ve Partner Önerileri Mühürlendi: {instance.full_name}", flush=True)

        except Exception as e:
            print(f"⚠️ Analiz/Eşleştirme Hatası: {str(e)}", flush=True)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        🚀 HIZLI HAT: GET isteği milisaniyeler içinde yanıt verir.
        """
        try:
            researcher = Researcher.objects.get(user=request.user)
            
            if request.method == 'PATCH':
                old_bio = researcher.bio 
                serializer = self.get_serializer(researcher, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                
                # Ağır işleri arka planda mühürleyen fonksiyonu çağır
                self._trigger_ai_analysis(instance, old_bio, serializer.validated_data)
                
                # Serializer veritabanındaki yeniSuggestions'ları yakalaması için instance'ı yenile
                instance.refresh_from_db()
                return Response(self.get_serializer(instance).data)
            
            # 🏁 GET DURUMU: Doğrudan DB'deki hazır 'suggestions_json' döner. AI çalışmaz!
            return Response(self.get_serializer(researcher).data)
            
        except Researcher.DoesNotExist: 
            return Response({"detail": "Profil bulunamadı."}, status=404)

    def perform_update(self, serializer):
        # Standart ModelViewSet güncellemeleri için koruma kalkanı
        old_bio = self.get_object().bio
        instance = serializer.save()
        self._trigger_ai_analysis(instance, old_bio, serializer.validated_data)

    @action(detail=False, methods=['post'], url_path='onboard', permission_classes=[AllowAny])
    def onboard(self, request):
        serializer = ResearcherOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        
        try:
            # 🛰️ ATOMİK MÜHÜR: Bir işlem bile hata verirse tüm kayıt geri alınır
            with transaction.atomic():
                # 1. Django User oluştur
                user = User.objects.create_user(
                    username=d['email'], 
                    email=d['email'], 
                    password=d['password']
                )
                
                # 2. Researcher profilini oluştur ve User'a mühürle
                res = Researcher.objects.create(
                    user=user, 
                    full_name=d['full_name'], 
                    email=d['email'], 
                    department_id=d['department_id'], 
                    bio=d.get('bio', ''), 
                    role=d.get('role', 'student'),
                    title=d.get('title', '')
                )
                
                # 3. Eğer bio varsa AI analizini burada da tetikle
                if res.bio:
                    dept_name = res.department.name if res.department else "General Academic"
                    # AI servisini çağır (Embedding + Skill Extraction)
                    # res.embedding = generate_embedding(res.bio) 
                    # res.save()

                # 4. Opsiyonel Proje oluşturma mantığı (Mevcut kodunla aynı)
                if d.get('create_project'):
                    p = d['create_project']
                    proj = Project.objects.create(
                        title=p['title'], 
                        summary=p.get('summary', ''), 
                        pi=res, 
                        department_id=d['department_id']
                    )
                    ProjectResearcher.objects.create(
                        project=proj, 
                        researcher=res, 
                        role="Principal Investigator", 
                        joined_at=timezone.now()
                    )
                
                return Response({"id": res.researcher_id, "detail": "Otonom kayıt başarılı."}, status=201)
                
        except Exception as e:
            # Hata anında 'user' veritabanına hiç yazılmamış gibi davranılır
            return Response({"detail": f"Kayıt Hatası: {str(e)}"}, status=500)

    # server/core/views.py

    @action(detail=True, methods=['POST'], url_path='send-request')
    def send_request(self, request, pk=None):
        receiver = self.get_object()
        sender = Researcher.objects.get(user=request.user)
        serializer = SendCollaborationRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            existing_req = CollaborationRequest.objects.filter(
                sender=sender, 
                receiver=receiver, 
                project_id=serializer.validated_data['project_id']
            ).first()

            if existing_req:
                if existing_req.status == 'pending':
                    return Response({"detail": "Bu projeye zaten beklemede olan bir talebiniz var."}, status=400)
                
                # 🛡️ 10 GÜN KONTROLÜ
                if existing_req.status == 'rejected':
                    cooldown_limit = existing_req.updated_at + timedelta(days=10)
                    if timezone.now() < cooldown_limit:
                        remaining_days = (cooldown_limit - timezone.now()).days
                        return Response({
                            "detail": f"10 gün boyunca aynı proje için birden fazla istek veya davet gönderilemez. (Kalan süre: {remaining_days + 1} gün)"
                        }, status=400)
                
                # 🔄 İsteği Tazele (Sinyal burada otomatik çalışacak)
                existing_req.status = 'pending'
                existing_req.message = serializer.validated_data.get('message', '')
                existing_req.save()
                return Response({"detail": "İş birliği talebiniz otonom olarak tazelendi."}, status=200)

            # 🛰️ Yeni Kayıt (Sinyal burada otomatik çalışacak)
            CollaborationRequest.objects.create(
                sender=sender,
                receiver=receiver,
                project_id=serializer.validated_data['project_id'],
                request_type=serializer.validated_data['request_type'],
                message=serializer.validated_data.get('message', '')
            )
            return Response({"detail": "İş birliği talebi fırlatıldı."}, status=201)
            
        return Response(serializer.errors, status=400)  

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
        """
        ORM DÖNÜŞÜMÜ: memberships__researcher_id filtresi 
        Project modelinde Researcher ile olan Many-to-Many adıdır.
        """
        # Burada 'memberships' ismini kullandığın için Project modelinde 
        # related_name='memberships' olduğundan emin olmalısın.
        projs = Project.objects.filter(memberships__researcher_id=pk).values(
            'project_id', 'title', 'status', 'start_date', 'end_date'
        )
        return Response(list(projs))

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        """
        Hatasız ORM Sorgusu: Doğrudan model üzerinden çekiyoruz.
        """
        skills = ResearcherSkill.objects.filter(researcher_id=pk).values(
            id=F('skill__skill_id'), 
            name=F('skill__name'), 
            level=F('level')
        )
        return Response(list(skills))

# -------------------------
#  PROJE VE YAYIN VIEWSETLER
# -------------------------

class ProjectViewSet(viewsets.ModelViewSet):
    """
    🛰️ PROJE İSTASYONU:
    Proje yönetimi, bütçe takibi ve projeye özel AI eşleşme motorunu mühürler.
    """
    queryset = Project.objects.all().order_by('-created_at') # En yeni projeler en üstte
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    
    # 🔄 MÜHÜR: 'status' yerine 'phase' (aşama) üzerinden filtreleme yapılır
    filterset_fields = {'department': ['exact'], 'phase': ['exact']}
    search_fields = ['title', 'summary', 'requirements']

    def perform_create(self, serializer):
        """🚀 OTONOM MÜHÜR: Proje kaydedilirken AI motorunu uyandırır."""
        from .services import generate_embedding # 🛰️ Yerel import ile bağımlılık hatası önlendi
        
        # 1. Proje yöneticisini (PI) otonom olarak mevcut kullanıcıya mühürle
        researcher = Researcher.objects.get(user=self.request.user)
        instance = serializer.save(pi=researcher)
        
        # 2. AI ANALİZİ: Başlık, Konu ve Gereksinimlerden anlamsal vektör üret
        combined_text = f"{instance.title}. {instance.summary or ''}. Needs: {instance.requirements or ''}"
        vector = generate_embedding(combined_text)
        
        if vector:
            instance.embedding = vector
            instance.save(update_fields=['embedding'])
            print(f"✅ AI MÜHÜRÜ: '{instance.title}' projesi için semantik vektör üretildi.", flush=True)

    @action(detail=True, methods=['get'])
    def suggestions(self, request, pk=None):
        """
        🧠 AI MATCHING ENGINE: Bu projeye özel en uygun araştırmacıları otonom bulur.
        Frontend'deki yüzen adada (Modal) listelenen akıllı önerileri bu fonksiyon fırlatır.
        """
        from .services import get_project_specific_suggestions
        # Hibrit skorlamayı (%50 Semantik + %40 Skill + %10 Dept) çalıştırır
        suggestions = get_project_specific_suggestions(pk, limit=5)
        return Response(suggestions)

    @action(detail=True, methods=['get'])
    def researchers(self, request, pk=None):
        """Proje mürettebatını (üyeleri) listeler."""
        ms = ProjectResearcher.objects.filter(project_id=pk).select_related('researcher')
        return Response([
            {
                "researcher_id": m.researcher.researcher_id, 
                "full_name": m.researcher.full_name, 
                "role": m.role
            } for m in ms
        ])

    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        """Projeye yeni üye mühürler."""
        d = request.data
        ProjectResearcher.objects.get_or_create(
            project_id=pk, 
            researcher_id=d['researcher_id'], 
            defaults={'role': d.get('role', 'Researcher'), 'joined_at': timezone.now()}
        )
        return Response({"detail": "Mürettebat eklendi"}, status=201)

    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        """Projenin finansal destek ve grant bilgilerini döner."""
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


# core/views.py (En alta ekle)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 🛡️ GÜVENLİK MÜHÜRÜ: Sadece giriş yapmış olan araştırmacının bildirimlerini göster/sil
        try:
            res = Researcher.objects.get(user=self.request.user)
            return Notification.objects.filter(recipient=res)
        except Researcher.DoesNotExist:
            return Notification.objects.none()    