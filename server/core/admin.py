from django.contrib import admin
from .models import (
    Researcher, Department, Project, Publication, 
    Skill, Tag, EntityTag, FundingAgency, 
    FundingAgencyGrant, Notification, CollaborationRequest,
    ProjectResearcher,
    ResearcherSkill  # <-- YENİ: Yetenek ilişkisi mühürlendi!
)

# ---------------------------------------------------------
# 0. INLINES: OTONOM ALT YÖNETİM PANELLERİ 🛰️
# ---------------------------------------------------------

class ProjectResearcherInline(admin.TabularInline):
    """Proje sayfasında mürettebat listesini yönetmek için."""
    model = ProjectResearcher
    extra = 1

class ResearcherSkillInline(admin.TabularInline):
    """
    YENİ: Araştırmacı sayfasında yetenekleri ve seviyelerini (1-5) 
    doğrudan yönetebilmen için eklendi.
    """
    model = ResearcherSkill
    extra = 1

# ---------------------------------------------------------
# 1. ARAŞTIRMACI (RESEARCHER) - GÜNCELLEME 🚀
# ---------------------------------------------------------
@admin.register(Researcher)
class ResearcherAdmin(admin.ModelAdmin):
    list_display = ('researcher_id', 'full_name', 'role', 'department', 'email')
    list_display_links = ('full_name',)
    list_filter = ('role', 'department')
    search_fields = ('full_name', 'email')
    # Araştırmacı içinden yeteneklerini direkt yönet:
    inlines = [ResearcherSkillInline]

# ---------------------------------------------------------
# 2. PROJELER (PROJECTS)
# ---------------------------------------------------------
# server/core/admin.py

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    # 🛰️ MÜHÜR: 'status' alanları 'phase' olarak güncellendi
    list_display = ('project_id', 'title', 'phase', 'pi', 'created_at')
    list_filter = ('phase', 'department') 
    search_fields = ('title', 'summary')
    inlines = [ProjectResearcherInline]

# ---------------------------------------------------------
# 3. İŞBİRLİĞİ TALEPLERİ VE DİĞERLERİ
# ---------------------------------------------------------
@admin.register(CollaborationRequest)
class CollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'sender', 'receiver', 'project', 'status', 'created_at')
    list_filter = ('status', 'request_type')

@admin.register(ProjectResearcher)
class ProjectResearcherAdmin(admin.ModelAdmin):
    list_display = ('project', 'researcher', 'role', 'joined_at')
    list_filter = ('role', 'project')

@admin.register(ResearcherSkill)
class ResearcherSkillAdmin(admin.ModelAdmin):
    """Yetenek eşleşmelerini bağımsız yönetmek için."""
    list_display = ('researcher', 'skill', 'level')
    list_filter = ('skill', 'level')

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('department_id', 'name')

# Basit Kayıtlar
admin.site.register(Skill)
admin.site.register(Tag)
admin.site.register(Publication)
admin.site.register(FundingAgency)
admin.site.register(FundingAgencyGrant)
admin.site.register(EntityTag)
admin.site.register(Notification)