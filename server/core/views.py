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
import threading
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Researcher
from .serializers import ResearcherMeSerializer, ResearcherSerializer # 🛡️ Hafif ve Tam Serializer
# Modeller ve Serializerlar (TÜMÜ KORUNDU)
from .models import *
from .serializers import *
from .services import get_collaboration_suggestions, generate_embedding, analyze_skills_with_gemini
from .permissions import IsAcademicianOrReadOnly, IsResearcherOwnerOrReadOnly
from .serializers import (
    ProjectSerializer,
    DepartmentSerializer,  # 🛡️ EKSİK OLAN SATIR BU
    NotificationSerializer,
    TagSerializer,
    EntityTagSerializer,
    SkillSerializer,
    FundingAgencySerializer,
    FundingAgencyGrantSerializer,
    ResearcherSerializer,
    ResearcherOnboardSerializer,
    PublicationSerializer,
    NetworkGraphSerializer,
    DashboardStatsSerializer,
    SendCollaborationRequestSerializer,
    RespondCollaborationRequestSerializer,
    RegisterSerializer,
    NetworkNodeSerializer,
    NetworkEdgeSerializer
)
# -------------------------
#  Basit CRUD ViewSet'ler (URLs.py bağımlılıkları için tam liste)
# -------------------------
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10  # Her sayfada kaç kullanıcı görünsün?
    page_size_query_param = 'page_size'
    max_page_size = 100


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
        🚀 ASENKRON MÜHÜR: SIGKILL hatasını kökten çözer.
        Tüm ağır AI, Embedding ve Öneri işlemlerini arka plan thread'ine hapseder.
        """
        new_bio = validated_data.get('bio')
        
        # 1. Kontrol: Biyografi aynıysa veya boşsa işlem yapma
        if not new_bio or new_bio == old_bio:
            print(f"ℹ️ AI ve Öneriler Atlandı: Biyografi aynı. ({instance.full_name})", flush=True)
            return

        import threading

        # 🛰️ ANALİZ BAŞLADI: Dashboard'da spinner'ı yakmak için bayrağı mühürle
        instance.is_analyzing = True
        instance.save(update_fields=['is_analyzing'])

        def background_ai_task(res_id, bio_text):
            """Thread içinde çalışacak ağır operasyon motoru."""
            try:
                # 🛡️ GÜVENLİK: Thread içinde nesneyi tekrar çekmek veritabanı bütünlüğü için şarttır.
                from .models import Researcher, Skill, ResearcherSkill
                from .services import analyze_skills_with_gemini, generate_embedding, get_collaboration_suggestions

                res = Researcher.objects.get(pk=res_id)
                dept_name = res.department.name if res.department else "General Academic"
                
                # 🧠 1. Adım: Gemini Skill Extraction (10-12 saniye)
                ai_data, raw_debug = analyze_skills_with_gemini(bio_text, dept_name)
                
                final_skills = {}
                if isinstance(ai_data, list) and len(ai_data) > 0:
                    for item in ai_data:
                        if isinstance(item, dict): final_skills.update(item)
                elif isinstance(ai_data, dict):
                    final_skills = ai_data

                res.skills = final_skills if final_skills else {"DEBUG_RAW": str(raw_debug)[:200]}
                
                # 🗄️ ResearcherSkill modellerini otonom güncelle
                ResearcherSkill.objects.filter(researcher=res).delete()
                if final_skills:
                    for s_name, s_level in final_skills.items():
                        skill_obj, _ = Skill.objects.get_or_create(name=str(s_name)[:100])
                        try:
                            level_int = int(s_level)
                        except (ValueError, TypeError):
                            level_int = 50
                        ResearcherSkill.objects.create(researcher=res, skill=skill_obj, level=level_int)

                # 🚀 2. Adım: Embedding Üretimi (Ağır İşlem)
                user_skills = ResearcherSkill.objects.filter(researcher=res).select_related('skill')
                skill_weights = ", ".join([f"{s.skill.name}:{s.level}" for s in user_skills])
                semantic_text = f"{res.title}. {bio_text}. Skills: {skill_weights}"
                res.embedding = generate_embedding(semantic_text)
                
                # 🛰️ 3. Adım: Partner Önerilerini HESAPLA ve MÜHÜRLE
                res.suggestions_json = get_collaboration_suggestions(res.researcher_id, limit=5)
                
                # ✅ FİNAL: Tüm verileri mühürle ve spinner bayrağını kapat
                res.is_analyzing = False
                res.save(update_fields=['skills', 'embedding', 'suggestions_json', 'is_analyzing'])
                print(f"✅ AI Analizi Arka Planda Tamamlandı: {res.full_name}", flush=True)

            except Exception as e:
                print(f"❌ Arka Plan AI Hatası: {str(e)}", flush=True)
                # Hata durumunda bile UI'ı kilitli bırakmamak için spinner'ı kapatmayı dene
                try:
                    Researcher.objects.filter(pk=res_id).update(is_analyzing=False)
                except: pass

        # 🚀 ATEŞLE VE UNUT: Thread'i başlat ve Response dönerken arka planda çalışsın.
        analysis_thread = threading.Thread(target=background_ai_task, args=(instance.researcher_id, new_bio))
        analysis_thread.start()
        print(f"🛰️ AI Analiz Thread'i Başlatıldı: {instance.full_name}", flush=True)

    # server/core/views.py




    def get_queryset(self):
        # 🛡️ VERİ MÜHRÜ: 'prefetch_related' profil sayfasındaki boşlukları doldurur.
        # 'select_related' ise departman verisini JOIN ile tek seferde çeker.
        queryset = Researcher.objects.select_related('department').prefetch_related(
            'researcher_skills__skill'
        ).all()
        
        # 🛰️ Metin Bazlı Arama
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(full_name__icontains=search)
            
        # 🛰️ Departman Filtresi
        dept = self.request.query_params.get('department')
        if dept:
            queryset = queryset.filter(department_id=dept)
            
        # 🔥 ESNEK YETENEK FİLTRESİ (C++ vs C++ Programming Çözümü)
        skills_raw = self.request.query_params.get('skills')
        if skills_raw:
            try:
                skill_ids = [int(s) for s in skills_raw.split(',')]
                # 1. Seçilen ID'lerin gerçek metin karşılıklarını (isimlerini) alıyoruz
                selected_skill_names = Skill.objects.filter(skill_id__in=skill_ids).values_list('name', flat=True)
                
                # 2. Her bir isim için kısmi eşleşme (icontains) uyguluyoruz
                for name in selected_skill_names:
                    # 'researcher_skills' mühürlendi (image_595600.jpg hatası giderildi)
                    queryset = queryset.filter(researcher_skills__skill__name__icontains=name)
            except (ValueError, TypeError):
                pass
                
        # 🚀 Performans ve Doğruluk: distinct() mükerrer kayıtları engeller.
        return queryset.order_by('-researcher_id').distinct()
    def get_serializer_class(self):
        # 🛰️ Eğer liste (GET /researchers/) isteniyorsa hafif olanı kullan
        if self.action == 'list':
            return ResearcherListSerializer
        return ResearcherSerializer            
        
    
    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        🚀 PERFORMANS MÜHRÜ: 
        - GET: Hafif veri paketi ve optimize edilmiş DB sorgusu (Hızlı).
        - PATCH: Arka plan AI analizi ve güncel profil (Güvenli).
        """
        try:
            # 1. DB Sorgu Optimizasyonu: Tüm ilişkileri tek seferde getir (N+1 Çözümü)
            queryset = Researcher.objects.select_related('department').prefetch_related(
                'researcher_skills__skill',
                'notifications'
            )
            researcher = queryset.get(user=request.user)
            
            # 🏁 PATCH DURUMU: Veri güncelleme ve AI tetikleme
            if request.method == 'PATCH':
                old_bio = researcher.bio 
                serializer = ResearcherSerializer(researcher, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                
                # 🛰️ ASENKRON TETİKLEME: Threading ile UI kilidini açıyoruz
                if 'bio' in serializer.validated_data and serializer.validated_data['bio'] != old_bio:
                    from .services import extract_skills_from_bio_task
                    thread = threading.Thread(
                        target=extract_skills_from_bio_task, 
                        args=(instance.researcher_id, instance.bio)
                    )
                    thread.start()
                
                instance.refresh_from_db()
                return Response(ResearcherSerializer(instance).data)
            
            # 🏁 GET DURUMU: Dashboard hızı için sadece hafif paketi dön
            # edited-image.png'deki 5s bekleme bu noktada milisaniyelere düşer.
            return Response(ResearcherMeSerializer(researcher).data)
            
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
        """
        🛡️ TEKNİK MÜHÜR: 3 Kademeli Güvenlik Bariyeri içeren İstek Motoru.
        1. PI Yetki Kontrolü, 2. Üyelik Kontrolü, 3. 10 Günlük Cooldown.
        """
        receiver = self.get_object()
        sender = Researcher.objects.get(user=request.user)
        serializer = SendCollaborationRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            project_id = serializer.validated_data['project_id']
            message = serializer.validated_data.get('message', '')
            request_type = serializer.validated_data['request_type']

            from .models import Project, ProjectResearcher, CollaborationRequest
            from django.utils import timezone
            from datetime import timedelta

            # 🛰️ 1. ADIM: Proje Verisini ve Yürütücü Durumunu Doğrula
            project = Project.objects.get(pk=project_id)

            # 🛡️ BARİYER 1: PI KONTROLÜ (Sadece Yürütücü Davet Atabilir)
            if request_type == 'invite' and project.pi != sender:
                return Response({
                    "detail": "Bu projeye davet gönderme yetkiniz yok. Sadece proje yürütücüsü davet gönderebilir."
                }, status=403)

            # 🛡️ BARİYER 2: ÜYELİK KONTROLÜ (Zaten ekipteyse engel ol)
            if ProjectResearcher.objects.filter(project=project, researcher=receiver).exists():
                return Response({
                    "detail": f"{receiver.full_name} zaten bu projenin bir üyesi."
                }, status=400)

            # 🛰️ 2. ADIM: Mevcut İstek ve Cooldown Taraması
            existing_req = CollaborationRequest.objects.filter(
                sender=sender, 
                receiver=receiver, 
                project=project
            ).first()

            if existing_req:
                if existing_req.status == 'pending':
                    return Response({"detail": "Bu projeye zaten beklemede olan bir talebiniz var."}, status=400)
                
                # 🛡️ BARİYER 3: 10 GÜNLÜK COOLDOWN (Reddedilenler için)
                if existing_req.status == 'rejected':
                    cooldown_limit = existing_req.updated_at + timedelta(days=10)
                    if timezone.now() < cooldown_limit:
                        remaining_days = (cooldown_limit - timezone.now()).days
                        return Response({
                            "detail": f"Talebiniz reddedildiği için 10 gün beklemeniz gerekmektedir. (Kalan: {remaining_days + 1} gün)"
                        }, status=403)
                
                # 🔄 Mevcut İsteği Tazele (Cooldown bittiyse)
                existing_req.status = 'pending'
                existing_req.message = message
                existing_req.request_type = request_type
                existing_req.save()
                req_obj = existing_req
            else:
                # 🛰️ Yeni İstek Kaydı
                req_obj = CollaborationRequest.objects.create(
                    sender=sender,
                    receiver=receiver,
                    project=project,
                    request_type=request_type,
                    message=message
                )

            # 🔔 ALICIYA BİLDİRİM MÜHRÜ
            Notification.objects.create(
                recipient=receiver,
                request_id=req_obj.request_id,
                title="Yeni İş Birliği Talebi",
                message=f"{sender.full_name}, '{project.title}' projesi için bir {req_obj.get_request_type_display().lower()} gönderdi."
            )

            return Response({"detail": "İş birliği talebi başarıyla fırlatıldı."}, status=201)
            
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['post'], url_path='respond-request')
    def respond_request(self, request):
        """
        🏁 YANIT VE GERİ BİLDİRİM MÜHRÜ:
        Talebi sonuçlandırır, üyeliği mühürler ve göndericiye sonuç bildirimi atar.
        """
        serializer = RespondCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        
        try:
            with transaction.atomic():
                # 1. Talebi Güncelle
                r = CollaborationRequest.objects.get(request_id=d['request_id'])
                r.status = d['status']
                r.response_message = d.get('response_message', '')
                r.save()

                # 2. Üyelik İşlemi (Kabul edildiyse)
                if d['status'] == 'accepted':
                    role = "Collaborator" if r.request_type == 'invite' else "Researcher"
                    new_member = r.receiver if r.request_type == 'invite' else r.sender
                    ProjectResearcher.objects.get_or_create(
                        project=r.project, 
                        researcher=new_member, 
                        defaults={'role': role, 'joined_at': timezone.now().date()}
                    )

                # 3. GÖNDERİCİYE SONUÇ BİLDİRİMİ:
                # İsteği atan kişiye "Kabul/Red" bilgisi gider.
                status_label = "kabul etti" if d['status'] == 'accepted' else "reddetti"
                Notification.objects.create(
                    recipient=r.sender,
                    request_id=r.request_id,
                    title="İş Birliği Talebi Cevaplandı",
                    message=f"{r.receiver.full_name}, '{r.project.title}' projesi için gönderdiğiniz talebi {status_label}."
                )

                # 4. Alıcının Dashboard'undaki mevcut bildirimi "Okundu" yap (Temizlik)
                Notification.objects.filter(
                    recipient=request.user.researcher, 
                    request_id=r.request_id
                ).update(is_read=True)

            return Response({"status": d['status']})
        except CollaborationRequest.DoesNotExist:
            return Response({"detail": "Talebe ulaşılamadı."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)

    # server/core/views.py -> ResearcherViewSet içindeki projects aksiyonu

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """
        🛰️ DATA STATION: Hedef araştırmacının yönettiği veya dahil olduğu projeleri mühürler.
        'status' yerine modeldeki 'phase' alanı kullanılarak 500 hatası engellenmiştir.
        """
        from django.db.models import Q
        
        # Hedef araştırmacıyı bul (pk = URL'deki ID)
        researcher = self.get_object()

        # Filtreleme: Araştırmacının PI olduğu projeler VEYA üye olduğu projeler
        # 'memberships__researcher' ilişkisi üzerinden gidiyoruz
        projs = Project.objects.filter(
            Q(pi=researcher) | Q(memberships__researcher=researcher)
        ).distinct().values(
            'project_id', 
            'title', 
            'phase',        # ✅ DOĞRU: 'status' yazılırsa FieldError (500) fırlatır
            'start_date', 
            'end_date'
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

# core/views.py içindeki ProjectViewSet'i bu şekilde mühürle:

import threading
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Project, Researcher, ProjectResearcher, FundingAgencyGrant
from .serializers import ProjectSerializer, FundingAgencyGrantSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {'department': ['exact'], 'phase': ['exact']}
    search_fields = ['title', 'summary', 'requirements']

    def get_queryset(self):
        """
        🛡️ GÜVENLİK KİLİDİ: Sadece kullanıcının dahil olduğu veya yönettiği projeler.
        """
        try:
            # 1. Mevcut oturum açmış araştırmacıyı çek
            researcher = Researcher.objects.get(user=self.request.user)
            
            # 🚀 KRİTİK DÜZELTME: 'researcher_skills' alanı Project modelinde yok.
            # Loglardaki ipucuna dayanarak 'memberships' üzerinden filtreleme yapıyoruz.
            return Project.objects.filter(
                Q(pi=researcher) | Q(memberships__researcher=researcher) 
            ).distinct().order_by('-created_at')
            
        except Researcher.DoesNotExist:
            # Profil bulunamazsa boş liste dönerek 500 hatasını engelle
            return Project.objects.none()

    def perform_create(self, serializer):
        """
        🚀 PERFORMANS MÜHRÜ: 
        Proje anında oluşturulur, AI analizi arka planda sessizce çalışır.
        """
        try:
            # 1. PI Ataması: Projeyi oluşturan kişiyi Yürütücü olarak mühürle
            researcher = Researcher.objects.get(user=self.request.user)
            instance = serializer.save(pi=researcher)
            
            # 2. ASENKRON AI TETİKLEME: 
            # loglarda görülen 30 saniyelik kilitlenmeyi (SIGKILL) engeller.
            from .services import generate_embedding
            
            def run_project_ai_task(project_id, text_to_embed):
                try:
                    vector = generate_embedding(text_to_embed)
                    if vector:
                        # update_fields kullanarak sonsuz döngüyü kırıyoruz
                        Project.objects.filter(pk=project_id).update(embedding=vector)
                        print(f"✅ AI MÜHÜRÜ: '{instance.title}' vektörü üretildi.")
                except Exception as e:
                    print(f"❌ AI Arka Plan Hatası: {e}")

            combined_text = f"{instance.title}. {instance.summary or ''}. Needs: {instance.requirements or ''}"
            
            # Thread başlatılıyor (Ateşle ve Unut)
            task_thread = threading.Thread(
                target=run_project_ai_task, 
                args=(instance.project_id, combined_text)
            )
            task_thread.start()

        except Researcher.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "Araştırmacı profiliniz bulunamadı."})

    @action(detail=True, methods=['get'])
    def suggestions(self, request, pk=None):
        """
        🧠 AI MATCHING ENGINE: 
        Mevcut kullanıcıyı (istek atan) dışlayarak hibrit skorlama yapar.
        """
        from .services import get_project_specific_suggestions
        
        try:
            # 🛰️ 1. Mevcut oturum açmış araştırmacıyı tespit et
            current_res = Researcher.objects.get(user=request.user)
            
            # 🚀 2. Öneri motoruna hem proje ID'sini hem de dışlanacak kullanıcı ID'sini gönder
            # 'exclude_id' parametresi ile kendi profilimizi listeden siliyoruz.
            suggestions = get_project_specific_suggestions(
                project_id=pk, 
                exclude_id=current_res.researcher_id, 
                limit=5
            )
            
            return Response(suggestions)
            
        except Researcher.DoesNotExist:
            return Response({"detail": "Araştırmacı profili bulunamadı."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def researchers(self, request, pk=None):
        """Proje mürettebatını listeler."""
        ms = ProjectResearcher.objects.filter(project_id=pk).select_related('researcher')
        return Response([
            {
                "researcher_id": m.researcher.researcher_id, 
                "full_name": m.researcher.full_name, 
                "role": m.role
            } for m in ms
        ])

    # server/core/views.py -> ProjectViewSet içinde

    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        """🛡️ YETKİ MÜHRÜ: Sadece proje yöneticisi üye ekleyebilir."""
        project = self.get_object()
        current_researcher = Researcher.objects.get(user=request.user)

        # 🚫 Güvenlik Kontrolü
        if project.pi != current_researcher:
            return Response(
                {"detail": "Bu işlem için yetkiniz yok. Sadece proje yürütücüsü üye ekleyebilir."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        d = request.data
        ProjectResearcher.objects.get_or_create(
            project_id=pk, 
            researcher_id=d['researcher_id'], 
            defaults={'role': d.get('role', 'Researcher'), 'joined_at': timezone.now()}
        )
        return Response({"detail": "Mürettebat eklendi"}, status=201)

    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        """Finansal destek bilgilerini döner."""
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
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 🛡️ GÜVENLİK MÜHÜRÜ: Sadece giriş yapmış olan araştırmacının bildirimlerini göster/sil
        try:
            res = Researcher.objects.get(user=self.request.user)
            return Notification.objects.filter(recipient=res)
        except Researcher.DoesNotExist:
            return Notification.objects.none()    