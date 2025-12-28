# server/core/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema_field
from django.db.models import Q
from .models import (
    Department, Researcher, Project, Publication, 
    FundingAgency, FundingAgencyGrant, Tag, 
    EntityTag, Skill, ProjectResearcher, CollaborationRequest, Notification, ResearcherSkill
)
from .services import get_collaboration_suggestions

# --- 1. TEMEL MODEL SERIALIZER'LAR ---

class PublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = ['publication_id', 'title', 'venue', 'year', 'doi', 'project', 'created_at']

class FundingAgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingAgency
        fields = ['funding_agency_id', 'name', 'country', 'website']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class FundingAgencyGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingAgencyGrant
        fields = ['grant_id', 'project', 'funding_agency', 'program_name', 'amount', 'currency', 'start_date', 'end_date']

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

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        # 🚀 KRİTİK: 'id' yerine modeldeki 'notification_id' mühürlendi
        fields = ['notification_id', 'title', 'message', 'is_read', 'created_at', 'request_id']

class SimpleNotificationSerializer(serializers.ModelSerializer):
    """🚀 HIZ VE BİLGİ MÜHRÜ: Dashboard için hafif paket."""
    class Meta:
        model = Notification
        fields = ['notification_id', 'title', 'message', 'is_read', 'created_at', 'request_id']

# --- 2. ANA ARAŞTIRMACI MOTORU (DASHBOARD VE LİSTE) ---

class ResearcherListSerializer(serializers.ModelSerializer):
    """⚡ HIZ MÜHRÜ: Arama listelerinde kullanılan hafif paket."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    class Meta:
        model = Researcher
        fields = ['researcher_id', 'full_name', 'email', 'role', 'title', 'department_name']

class ResearcherMeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    notif_count = serializers.SerializerMethodField()
    skills = serializers.JSONField(read_only=True) 
    notifications = serializers.SerializerMethodField()

    class Meta:
        model = Researcher
        fields = [
            'researcher_id', 'full_name', 'role', 'title', 'bio', 'department',
            'department_name', 'skills', 'is_analyzing', 'notifications', 'notif_count'
        ]

    def get_notif_count(self, obj):
        return obj.notifications.filter(is_read=False).count()

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_notifications(self, obj):
        """Dashboard bildirim kutusu ve Review Modal içeriği."""
        notes = obj.notifications.all().order_by('-created_at')[:15]
        result = []
        for n in notes:
            # 🛡️ KRİTİK: select_related ile hızı koruyarak bio verisini çekiyoruz
            req = CollaborationRequest.objects.filter(request_id=n.request_id).select_related('sender', 'project').first() if n.request_id else None
            
            result.append({
                'notification_id': n.notification_id,
                'id': n.notification_id,
                'title': n.title,
                'message': n.message,
                'request_id': n.request_id,
                'is_actionable': bool(n.request_id),
                'sender_name': req.sender.full_name if req else "Sistem",
                'project_name': req.project.title if req else "Genel",
                'status': req.status if req else 'completed',
                # 🚀 MÜHÜR: Bionun modalda görünmesi için buraya ekledik
                'sender_bio': req.sender.bio if req and req.sender.bio else "Biography not provided.",
                'request_message': req.message if req else ""
            })
        return result

class ResearcherSerializer(serializers.ModelSerializer):
    """Tam profil detay sayfası için kullanılan ağır serializer."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    suggestions = serializers.SerializerMethodField()
    received_requests = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()
    notifications = serializers.SerializerMethodField() 
    skills_list = serializers.SerializerMethodField()

    class Meta:
        model = Researcher
        fields = '__all__'

    def get_skills_list(self, obj):
        return [rs.skill.name for rs in obj.researcher_skills.all()]

    def get_notifications(self, obj):
        # Detay sayfasında da MeSerializer mantığını kullanıyoruz
        return ResearcherMeSerializer().get_notifications(obj)

    def get_projects(self, obj):
        from .models import Project
        projs = Project.objects.filter(Q(pi=obj) | Q(memberships__researcher=obj)).distinct()
        return [{
            'project_id': p.project_id,
            'title': p.title,
            'status': p.phase,
            'my_role': 'PI' if p.pi == obj else 'Member'
        } for p in projs]

    def get_received_requests(self, obj):
        requests = CollaborationRequest.objects.filter(receiver=obj, status='pending')
        return [{
            'request_id': r.request_id,
            'sender_name': r.sender.full_name,
            'project_name': r.project.title,
            'status': r.status
        } for r in requests]

    def get_suggestions(self, obj):
        return []

# --- 3. AKSİYON VE KAYIT SERIALIZER'LARI ---

class ResearcherOnboardSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=True)
    department_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['student', 'academician'], default='student')
    title = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    create_project = serializers.DictField(required=False)

class SendCollaborationRequestSerializer(serializers.Serializer):
    receiver_id = serializers.IntegerField()
    project_id = serializers.IntegerField()
    request_type = serializers.ChoiceField(choices=['invite', 'join_request'])
    message = serializers.CharField(required=False, allow_blank=True)

class RespondCollaborationRequestSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['accepted', 'rejected']) 
    response_message = serializers.CharField(required=False, allow_blank=True)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

# --- 4. ANALİTİK VE PROJE ---

class DashboardStatsSerializer(serializers.Serializer):
    total_researchers = serializers.IntegerField()
    total_projects = serializers.IntegerField()
    total_publications = serializers.IntegerField()

class NetworkNodeSerializer(serializers.Serializer):
    id = serializers.IntegerField(); label = serializers.CharField(); group = serializers.CharField(required=False); title = serializers.CharField(required=False, allow_null=True)

class NetworkEdgeSerializer(serializers.Serializer):
    from_id = serializers.IntegerField(source='from'); to = serializers.IntegerField(); value = serializers.IntegerField(); type = serializers.CharField()

class FundingSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='funding_agency.name', read_only=True)
    class Meta:
        model = FundingAgencyGrant
        fields = ['grant_id', 'agency_name', 'amount', 'currency', 'start_date', 'end_date']

class NetworkGraphSerializer(serializers.Serializer):
    nodes = NetworkNodeSerializer(many=True); edges = NetworkEdgeSerializer(many=True)

class ProjectMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='researcher.full_name', read_only=True)
    researcher_id = serializers.IntegerField(source='researcher.researcher_id', read_only=True)
    class Meta:
        model = ProjectResearcher
        fields = ['researcher_id', 'full_name', 'role']

class ProjectSerializer(serializers.ModelSerializer):
    # 🛰️ MÜHÜR: Proje yöneticisinin ismini doğrudan pakete ekliyoruz
    pi_name = serializers.CharField(source='pi.full_name', read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True, source='memberships')
    
    class Meta:
        model = Project
        fields = '__all__' # pi_name artık bu paketin içinde
        read_only_fields = ['pi', 'embedding', 'created_at']