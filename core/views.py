from django.db import connection,transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .services import get_collaboration_suggestions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import (
    Department,
    Researcher,
    Project,
    Publication,
    FundingAgency,
    FundingAgencyGrant,
    Tag,
    EntityTag,
    Skill,
)
from .serializers import (
    DepartmentSerializer,
    ResearcherSerializer,
    ProjectSerializer,
    PublicationSerializer,
    FundingAgencySerializer,
    FundingAgencyGrantSerializer,
    TagSerializer,
    EntityTagSerializer,
    SkillSerializer,
)


# -------------------------
#  Basit CRUD ViewSet'ler
# -------------------------

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().order_by('department_id')
    serializer_class = DepartmentSerializer


class ResearcherViewSet(viewsets.ModelViewSet):
    queryset = Researcher.objects.all().order_by('researcher_id')
    serializer_class = ResearcherSerializer
    # --- YENİ EKLENEN KISIM ---
   # Filtreleme Motorlarını Aktif Et
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # --- BURAYI DEĞİŞTİRİYORUZ (Eskisi listeydi, şimdi sözlük yaptık) ---
    filterset_fields = {
        'department': ['exact'],        # ID olduğu için TAM eşleşme olsun (1 ise 1)
        'title': ['icontains'],         # "Dr" yazınca "Prof. Dr." da gelsin (Partial Match)
        'email': ['icontains'],         # "ali" yazınca "ali@univ..." gelsin
        'full_name': ['icontains'],     # İsimde parça arama
    }
    # -------------------------------------------------------------------
    
    search_fields = ['full_name', 'email', 'bio']
    ordering_fields = ['full_name', 'created_at']
    @action(detail=False, methods=['post'], url_path='onboard')
    def onboard(self, request):
        """
        POST /api/researchers/onboard/
        
        Bu endpoint:
        1. Yeni bir araştırmacı oluşturur.
        2. Gelen skill_ids ve tag_ids listelerine göre ilişkileri kurar.
        3. İşlem biter bitmez AI algoritmasını çalıştırıp önerileri döner.
        """
        data = request.data
        
        # 1. Validasyon: Zorunlu alanlar var mı?
        required_fields = ['full_name', 'email', 'department_id']
        for field in required_fields:
            if field not in data:
                return Response(
                    {"detail": f"Eksik bilgi: {field} alanı zorunludur."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            # transaction.atomic(): Ya hepsi kaydedilir ya hiçbiri (Hata olursa geri alır)
            with transaction.atomic():
                # A) Araştırmacıyı Kaydet
                new_researcher = Researcher.objects.create(
                    full_name=data['full_name'],
                    email=data['email'],
                    department_id=data['department_id'],
                    title=data.get('title', ''),
                    bio=data.get('bio', '')
                )
                
                new_id = new_researcher.researcher_id

                # B) Yetenekleri (Skills) Ekle
                skill_ids = data.get('skill_ids', [])
                if skill_ids:
                    # Raw SQL ile performansı artırıyoruz
                    with connection.cursor() as cursor:
                        for s_id in skill_ids:
                            cursor.execute("""
                                INSERT INTO researcher_skill (researcher_id, skill_id, level)
                                VALUES (%s, %s, 1) 
                            """, [new_id, s_id]) 
                            # Not: Varsayılan level 1 olarak atandı, istersen parametre olarak alabilirsin.

                # C) İlgi Alanlarını (Tags) Ekle
                tag_ids = data.get('tag_ids', [])
                if tag_ids:
                    with connection.cursor() as cursor:
                        for t_id in tag_ids:
                            cursor.execute("""
                                INSERT INTO entity_tag (entity_type, entity_id, tag_id)
                                VALUES ('researcher', %s, %s)
                            """, [new_id, t_id])

            # Transaction bitti, veriler güvenle kaydedildi.
            
            # 2. AI Analizi: Yeni eklenen kişi için önerileri getir
            suggestions = get_collaboration_suggestions(new_id, limit=5)

            # 3. Yanıt Dön
            return Response({
                "message": "Araştırmacı başarıyla sisteme eklendi ve analiz edildi.",
                "new_researcher": {
                    "id": new_id,
                    "name": new_researcher.full_name,
                    "email": new_researcher.email,
                    "department": str(new_researcher.department) # __str__ metodunu kullanır
                },
                "collaboration_suggestions": suggestions
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Herhangi bir hata durumunda (örn: email zaten kayıtlı) buraya düşer
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



    @action(detail=True, methods=['get'], url_path='collaboration-suggestions')
    def collaboration_suggestions(self, request, pk=None):
        """
        /api/researchers/{id}/collaboration-suggestions/
        Belirli bir araştırmacı için potansiyel işbirliği adaylarını döner.

        Opsiyonel query param:
          - limit: döndürülecek maksimum öneri sayısı (default: 10)
        """
        try:
            base_researcher_id = int(pk)
        except (TypeError, ValueError):
            return Response({"detail": "Geçersiz researcher id."}, status=400)

        limit_param = request.query_params.get('limit', '10')
        try:
            limit = int(limit_param)
        except ValueError:
            limit = 10

        limit = max(1, min(limit, 50))  # 1 ile 50 arasında sınırla

        suggestions = get_collaboration_suggestions(base_researcher_id, limit=limit)
        return Response(suggestions)
    
    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """
        /api/researchers/{id}/projects
        Bu araştırmacının yer aldığı projeleri getirir.
        project_researcher tablosuna RAW SQL ile join atıyoruz.
        """
        researcher_id = pk

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.project_id,
                    p.title,
                    p.status,
                    p.start_date,
                    p.end_date
                FROM project_researcher pr
                JOIN project p
                    ON p.project_id = pr.project_id
                WHERE pr.researcher_id = %s
                ORDER BY p.project_id;
            """, [researcher_id])
            rows = cursor.fetchall()

        data = [
            {
                "project_id": row[0],
                "title": row[1],
                "status": row[2],
                "start_date": row[3],
                "end_date": row[4],
            }
            for row in rows
        ]
        return Response(data)

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        """
        /api/researchers/{id}/skills
        Araştırmacının skill listesini getirir (researcher_skill join'i).
        """
        researcher_id = pk

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    s.skill_id,
                    s.name,
                    rs.level
                FROM researcher_skill rs
                JOIN skill s
                    ON s.skill_id = rs.skill_id
                WHERE rs.researcher_id = %s
                ORDER BY s.name;
            """, [researcher_id])
            rows = cursor.fetchall()

        data = [
            {
                "skill_id": row[0],
                "name": row[1],
                "level": row[2],
            }
            for row in rows
        ]
        return Response(data)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('project_id')
    serializer_class = ProjectSerializer
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

    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        """
        POST /api/projects/{id}/researchers
        Body:
        {
          "researcher_id": 3,
          "role": "Researcher",
          "contribution_pct": 30,
          "joined_at": "2025-01-10"
        }
        project_researcher tablosuna INSERT atar.
        """
        project_id = pk
        researcher_id = request.data.get("researcher_id")
        role = request.data.get("role")
        contribution_pct = request.data.get("contribution_pct")
        joined_at = request.data.get("joined_at")

        if not researcher_id:
            return Response(
                {"detail": "researcher_id gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Basit validation (detaylandırılabilir)
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