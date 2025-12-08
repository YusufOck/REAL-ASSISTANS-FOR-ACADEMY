from django.contrib import admin
from .models import (
    Researcher, 
    Department, 
    Project, 
    Publication, 
    Skill, 
    Tag, 
    EntityTag,
    FundingAgency, 
    FundingAgencyGrant
)

# 1. ARAŞTIRMACI (RESEARCHER)
@admin.register(Researcher)
class ResearcherAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'role', 'department', 'email', 'title') 
    list_display_links = ('full_name',)
    list_filter = ('role', 'department', 'title')
    search_fields = ('full_name', 'email', 'bio')
    list_per_page = 20

# 2. BÖLÜMLER (DEPARTMENTS)
# Hata veren 'description' alanını kaldırdık
@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('department_id', 'name')
    search_fields = ('name',)

# 3. PROJELER (PROJECTS)
# Hata veren 'budget' alanını kaldırdık
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'start_date', 'end_date')
    list_filter = ('status',)
    search_fields = ('title', 'summary')

# 4. YETENEKLER (SKILLS)
@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('skill_id', 'name')
    search_fields = ('name',)

# 5. ETİKETLER (TAGS)
@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('tag_id', 'name')
    search_fields = ('name',)

# 6. YAYINLAR (PUBLICATIONS)
# Hata veren 'publication_type' ve 'publisher' alanlarını kaldırdık
@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = ('title', 'year', 'doi')  # DOI varsa ekleyelim, yoksa silebilirsin
    list_filter = ('year',)
    search_fields = ('title',)

# Diğerlerini basit şekilde kaydedelim
admin.site.register(FundingAgency)
admin.site.register(FundingAgencyGrant)
admin.site.register(EntityTag)



# Gerekli importu ekle (En üstte)
from .models import CollaborationRequest

# En alta ekle
@admin.register(CollaborationRequest)
class CollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'sender', 'receiver', 'project', 'status', 'created_at')
    list_filter = ('status', 'request_type')
    search_fields = ('sender__full_name', 'receiver__full_name', 'project__title')