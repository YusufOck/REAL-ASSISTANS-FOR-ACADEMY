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

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['tag_id', 'name']

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['skill_id', 'name']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['notification_id', 'title', 'message', 'is_read', 'created_at', 'request_id']

# --- 2. ARAŞTIRMACI VE DASHBOARD MOTORLARI ---

class ResearcherListSerializer(serializers.ModelSerializer):
    """Kullanıcı aramalarında kullanılan hafif liste serializerı."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    class Meta:
        model = Researcher
        fields = ['researcher_id', 'full_name', 'email', 'role', 'title', 'department_name']

class ResearcherMeSerializer(serializers.ModelSerializer):
    """
    ⚡ SİSTEMİN KALBİ: 
    Dashboard verilerini videodaki akışa uygun şekilde paketler.
    """
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
        """Dashboard bildirim kutusu ve Review Modal içeriği için mühürlenmiş veri."""
        notes = obj.notifications.all().order_by('-created_at')[:15]
        result = []
        for n in notes:
            # 🛡️ KRİTİK: N+1 engellemek için select_related mantığı viewda olmalı ama burada da güvenli çekiyoruz
            req = CollaborationRequest.objects.filter(request_id=n.request_id).select_related('sender', 'project').first() if n.request_id else None
            
            result.append({
                'notification_id': n.notification_id,
                'id': n.notification_id, # Frontend key uyumluluğu
                'title': n.title,
                'message': n.message,
                'created_at': n.created_at.strftime("%H:%M"),
                'request_id': n.request_id,
                'is_actionable': bool(n.request_id),
                'sender_name': req.sender.full_name if req else "Sistem",
                'project_name': req.project.title if req else "Genel",
                'status': req.status if req else 'completed',
                'request_message': req.message if req else ""
            })
        return result

class ResearcherSerializer(serializers.ModelSerializer):
    """Tam profil detay sayfası için kullanılan ağır serializer."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    projects = serializers.SerializerMethodField()
    skills_list = serializers.SerializerMethodField()

    class Meta:
        model = Researcher
        fields = '__all__'

    def get_skills_list(self, obj):
        return [rs.skill.name for rs in obj.researcher_skills.all()]

    def get_projects(self, obj):
        from .models import Project
        # Hem PI hem üye olduğu projeler
        projs = Project.objects.filter(Q(pi=obj) | Q(memberships__researcher=obj)).distinct()
        return [{
            'project_id': p.project_id,
            'title': p.title,
            'status': p.phase
        } for p in projs]

# --- 3. İŞ BİRLİĞİ VE KAYIT (DEĞİŞMEDİ) ---

class SendCollaborationRequestSerializer(serializers.Serializer):
    receiver_id = serializers.IntegerField()
    project_id = serializers.IntegerField()
    request_type = serializers.ChoiceField(choices=['invite', 'join_request'])
    message = serializers.CharField(required=False, allow_blank=True)

class RespondCollaborationRequestSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['accepted', 'rejected']) 
    response_message = serializers.CharField(required=False, allow_blank=True)

class ProjectMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='researcher.full_name', read_only=True)
    researcher_id = serializers.IntegerField(source='researcher.researcher_id', read_only=True)
    class Meta:
        model = ProjectResearcher
        fields = ['researcher_id', 'full_name', 'role']

class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True, source='memberships')
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['pi', 'embedding', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)