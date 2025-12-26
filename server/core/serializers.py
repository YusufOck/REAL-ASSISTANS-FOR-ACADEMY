# server/core/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema_field
from .models import (
    Department, Researcher, Project, Publication, 
    FundingAgency, FundingAgencyGrant, Tag, 
    EntityTag, Skill, ProjectResearcher, CollaborationRequest, Notification
)
# ÖNEMLİ: get_collaboration_suggestions importu kalsın, views.py kullanacak.
from .services import get_collaboration_suggestions

# --- 1. TEMEL MODEL SERIALIZER'LAR (DEĞİŞMEDİ) ---

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['department_id', 'name', 'code', 'faculty']

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['project_id', 'title', 'summary', 'status', 'start_date', 'end_date', 'pi', 'department', 'created_at']

class PublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = ['publication_id', 'title', 'venue', 'year', 'doi', 'project', 'created_at']

class FundingAgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingAgency
        fields = ['funding_agency_id', 'name', 'country', 'website']

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
    """
    🗑️ İMHA MÜHÜRÜ: Bildirimlerin silinebilmesi (Trash Can) için bu sınıf şarttır.
    """
    class Meta:
        model = Notification
        fields = ['notification_id', 'title', 'message', 'is_read', 'created_at', 'request_id']
# --- 2. ANA ARAŞTIRMACI MOTORU (DASHBOARD VERİSİ) ---

# core/serializers.py

class ResearcherSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    suggestions = serializers.SerializerMethodField()
    received_requests = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()
    # 🚀 YENİ MÜHÜR: Bildirimler bu kapıdan Dashboard'a akacak
    notifications = serializers.SerializerMethodField() 

    class Meta:
        model = Researcher
        fields = [
            'researcher_id', 'full_name', 'email', 'title',
            'department', 'department_name', 'bio',
            'created_at', 'skills', 'suggestions',
            'received_requests', 'projects',
            'notifications' # 🛰️ Listeye eklendi
        ]

    # core/serializers.py içindeki get_notifications metodunu güncelle:

    # core/serializers.py içindeki get_notifications metodu

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_notifications(self, obj):
        from .models import Notification, CollaborationRequest
        notes = Notification.objects.filter(recipient=obj).order_by('-created_at')[:15]
        result = []
        for n in notes:
            req = None
            if n.request_id:
                req = CollaborationRequest.objects.filter(request_id=n.request_id).first()
            
            # 🛰️ OTONOM KONTROL: Sadece 'YENİ' talepler modal açabilir
            is_actionable = n.title == "YENİ İŞ BİRLİĞİ TALEBİ"

            note_data = {
                'id': n.notification_id,
                'title': n.title,
                'message': n.message,
                'created_at': n.created_at.strftime("%H:%M"),
                'request_id': n.request_id,
                'is_actionable': is_actionable, # 🚀 Bu bayrak frontend'e yol gösterecek
                'sender_name': req.sender.full_name if req else "Sistem",
                'sender_bio': req.sender.bio if req else "",
                'sender_skills': req.sender.skills if req else {},
                'sender_title': req.sender.title if req else "Araştırmacı"
            }
            result.append(note_data)
        return result

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_projects(self, obj):
        from .models import Project, ProjectResearcher
        pi_ids = list(Project.objects.filter(pi=obj).values_list('project_id', flat=True))
        member_ids = list(ProjectResearcher.objects.filter(researcher=obj).values_list('project_id', flat=True))
        all_ids = set(pi_ids + member_ids)
        all_projects = Project.objects.filter(project_id__in=all_ids).distinct()
        
        result = []
        for p in all_projects:
            members = ProjectResearcher.objects.filter(project=p).select_related('researcher')
            group_members = [{
                'id': m.researcher.researcher_id,
                'name': m.researcher.full_name,
                'role': m.role
            } for m in members]
            
            result.append({
                'project_id': p.project_id,
                'title': p.title,
                'status': p.status,
                'my_role': 'PI (Lider)' if p.pi == obj else 'Member (Mürettebat)',
                'group_members': group_members
            })
        return result

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_received_requests(self, obj):
        # Bu alan UI'da görünmese bile arka plan verisi için korundu
        requests = CollaborationRequest.objects.filter(receiver=obj, status__in=['pending', 'Beklemede'])
        return [{
            'request_id': r.request_id,
            'sender_name': r.sender.full_name,
            'project_name': r.project.title,
            'message': r.message,
            'status': r.status,
            'request_type': r.request_type
        } for r in requests]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))    
    def get_suggestions(self, obj):
        """
        🚀 MÜHÜRLÜ HIZLI HAT: Veritabanındaki hazır JSON'u döner.
        """
        return obj.suggestions_json if obj.suggestions_json else []

# --- 3. AKSİYON VE KAYIT SERIALIZER'LARI (DEĞİŞMEDİ) ---

class ResearcherOnboardSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=True)
    department_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['student', 'academician'], default='student')
    title = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    skill_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    tag_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
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

# --- 4. ANALİTİK VE NETWORK SERIALIZER'LARI (DEĞİŞMEDİ) ---

class DashboardStatsSerializer(serializers.Serializer):
    total_researchers = serializers.IntegerField()
    total_projects = serializers.IntegerField()
    total_publications = serializers.IntegerField()

class NetworkNodeSerializer(serializers.Serializer):
    id = serializers.IntegerField(); label = serializers.CharField(); group = serializers.CharField(required=False); title = serializers.CharField(required=False, allow_null=True)

class NetworkEdgeSerializer(serializers.Serializer):
    from_id = serializers.IntegerField(source='from'); to = serializers.IntegerField(); value = serializers.IntegerField(); type = serializers.CharField()

class NetworkGraphSerializer(serializers.Serializer):
    nodes = NetworkNodeSerializer(many=True); edges = NetworkEdgeSerializer(many=True)