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