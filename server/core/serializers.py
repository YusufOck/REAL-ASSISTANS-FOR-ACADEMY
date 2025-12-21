from rest_framework import serializers
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
from django.contrib.auth.models import User
from rest_framework import serializers
from .services import get_collaboration_suggestions
from drf_spectacular.utils import extend_schema_field

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['department_id', 'name', 'code', 'faculty']



# serializers.py

# core/serializers.py




class ResearcherSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    # BU ALANLARIN BURADA TANIMLANMASI ŞART! (Class Meta dışında)
    suggestions = serializers.SerializerMethodField()
    received_requests = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField() 

    class Meta:
        model = Researcher
        fields = [
            'researcher_id',
            'full_name',
            'email',
            'title',
            'department',
            'department_name',
            'bio',
            'created_at',
            'skills',
            'suggestions',
            'received_requests',
            'projects' # Artık yukarıda tanımlandığı için hata vermeyecek
        ]

    

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_projects(self, obj):
        from .models import Project, ProjectResearcher
        
        # 1. HEM PI (Lider) olduğun HEM ÜYE olduğun projeleri otonom olarak çekiyoruz
        pi_projects = Project.objects.filter(pi=obj)
        member_projects = Project.objects.filter(memberships__researcher=obj)
        
        # 2. Tüm projeleri birleştir ve çift kayıtları mühürle
        all_projects = (pi_projects | member_projects).distinct()
        
        result = []
        for p in all_projects:
            # 3. Bu projedeki diğer mürettebatı (Grubu) bulalım
            # Senin dışındaki aktif üyeleri listeliyoruz
            members = ProjectResearcher.objects.filter(project=p).select_related('researcher')
            
            group_members = [{
                'id': m.researcher.researcher_id,
                'name': m.researcher.full_name,
                'role': m.role
            } for m in members]
            
            # 4. Proje kartını bir "Grup Hücresi" olarak mühürle
            result.append({
                'project_id': p.project_id,
                'title': p.title,
                'status': p.status,
                'my_role': 'PI (Lider)' if p.pi == obj else 'Member (Mürettebat)',
                'group_members': group_members # İşte aradığın "ayrı grup" verisi
            })
            
        return result

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))    
    def get_suggestions(self, obj):
        
        return get_collaboration_suggestions(obj.researcher_id, limit=5)

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_received_requests(self, obj):
        from .models import CollaborationRequest
        # Sadece bekleyen talepleri çekiyoruz
        requests = CollaborationRequest.objects.filter(receiver=obj, status='pending')
        return [{
            'request_id': r.request_id,
            'sender_name': r.sender.full_name,
            'project_name': r.project.title,
            'message': r.message,
            'status': r.status, # KRİTİK: Dashboard paneli için şart!
            'request_type': r.request_type
        } for r in requests]

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'project_id',
            'title',
            'summary',
            'status',
            'start_date',
            'end_date',
            'pi',
            'department',
            'created_at',
        ]


class PublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = [
            'publication_id',
            'title',
            'venue',
            'year',
            'doi',
            'project',
            'created_at',
        ]


class FundingAgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingAgency
        fields = ['funding_agency_id', 'name', 'country', 'website']


class FundingAgencyGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingAgencyGrant
        fields = [
            'grant_id',
            'project',
            'funding_agency',
            'program_name',
            'amount',
            'currency',
            'start_date',
            'end_date',
        ]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['tag_id', 'name']


class EntityTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTag
        fields = ['entity_tag_id', 'entity_type', 'entity_id', 'tag']


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['skill_id', 'name']



# core/serializers.py dosyasında:

# Mevcut ResearcherOnboardSerializer'ı GÜNCELLE:
class ResearcherOnboardSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    
    # --- YENİ EKLENEN: ŞİFRE ALANI 🔑 ---
    # write_only=True: Şifre sadece gönderilir, cevapta (response) ASLA geri dönmez (Güvenlik).
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'},
        help_text="Kullanıcının sisteme girişte kullanacağı şifre."
    )
    # ------------------------------------

    department_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['student', 'academician'], default='student')
    title = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    skill_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    tag_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    
    # PROJE OLUŞTURMA İSTEĞİ
    create_project = serializers.DictField(
        required=False, 
        help_text='{"title": "X", "summary": "Y", "status": "active"}'
    )

# --- YENİ EKLENEN SERIALIZER: İSTEK GÖNDERME ---
class SendCollaborationRequestSerializer(serializers.Serializer):
    receiver_id = serializers.IntegerField(help_text="Kime gönderiliyor?")
    project_id = serializers.IntegerField(help_text="Hangi proje için?")
    request_type = serializers.ChoiceField(choices=['invite', 'join_request'])
    message = serializers.CharField(required=False, allow_blank=True)

# --- YENİ EKLENEN SERIALIZER: İSTEK CEVAPLAMA ---
# core/serializers.py

class RespondCollaborationRequestSerializer(serializers.Serializer):
    # Frontend (React) ile milimetrik uyumlu anahtarlar:
    request_id = serializers.IntegerField()
    
    # 'response' yerine 'status' yapıyoruz çünkü React bunu gönderiyor
    status = serializers.ChoiceField(choices=['accepted', 'rejected']) 
    
    # İki tane 'message' yerine tek ve doğru isimli alan:
    response_message = serializers.CharField(
        required=False, 
        allow_blank=True, 
        help_text="İsteği kabul veya reddederken gönderilen not."
    )

class AddResearcherToProjectSerializer(serializers.Serializer):
    researcher_id = serializers.IntegerField(help_text="Projeye eklenecek araştırmacının ID'si")
    role = serializers.CharField(max_length=50, required=False, default="Researcher")
    contribution_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, help_text="Örn: 50.00")
    joined_at = serializers.DateField(required=False, help_text="YYYY-MM-DD formatında tarih")


# --- DASHBOARD & NETWORK İÇİN ÖZEL SERIALIZERLAR ---

class DashboardStatsSerializer(serializers.Serializer):
    """Dashboard istatistikleri için yanıt şeması"""
    total_researchers = serializers.IntegerField(help_text="Toplam araştırmacı sayısı")
    total_projects = serializers.IntegerField(help_text="Toplam proje sayısı")
    # BURASI DEĞİŞTİ: Senin view fonksiyonuna uygun hale getirildi 👇
    total_publications = serializers.IntegerField(help_text="Toplam yayın sayısı")

class NetworkNodeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()
    group = serializers.CharField(required=False)
    # EKLENDİ: View fonksiyonunda 'title' da gönderiyorsun 👇
    title = serializers.CharField(required=False, allow_null=True)

class NetworkEdgeSerializer(serializers.Serializer):
    # Python'da 'from' yasaklı kelime olduğu için değişken adını farklı yapıp source ile eşleştiriyoruz.
    from_id = serializers.IntegerField(source='from', help_text="Kaynak ID ('from' olarak döner)")
    to = serializers.IntegerField()
    # EKLENDİ: View fonksiyonunda bunları da gönderiyorsun 👇
    value = serializers.IntegerField(help_text="Bağlantı ağırlığı")
    type = serializers.CharField(help_text="Bağlantı türü (project/publication)")

class NetworkGraphSerializer(serializers.Serializer):
    """Network grafiği veri yapısı"""
    nodes = NetworkNodeSerializer(many=True)
    edges = NetworkEdgeSerializer(many=True)




class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=True) # Email zorunlu olsun

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user    