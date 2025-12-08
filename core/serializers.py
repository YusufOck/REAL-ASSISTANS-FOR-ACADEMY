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


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['department_id', 'name', 'code', 'faculty']


class ResearcherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Researcher
        fields = [
            'researcher_id',
            'full_name',
            'email',
            'title',
            'department',
            'bio',
            'created_at',
        ]


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
    department_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['student', 'academician'], default='student')
    title = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    skill_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    tag_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    
    # --- YENİ EKLENEN KISIM: PROJE OLUŞTURMA İSTEĞİ ---
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
class RespondCollaborationRequestSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    response = serializers.ChoiceField(choices=['accepted', 'rejected'])
    message = serializers.CharField(required=False, allow_blank=True, help_text="Örn: Memnuniyetle katılırım.")

    # core/serializers.py (En alta ekle)

class AddResearcherToProjectSerializer(serializers.Serializer):
    researcher_id = serializers.IntegerField(help_text="Projeye eklenecek araştırmacının ID'si")
    role = serializers.CharField(max_length=50, required=False, default="Researcher")
    contribution_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, help_text="Örn: 50.00")
    joined_at = serializers.DateField(required=False, help_text="YYYY-MM-DD formatında tarih")
