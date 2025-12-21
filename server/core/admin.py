from django.contrib import admin
from .models import (
    Researcher, Department, Project, Publication, 
    Skill, Tag, EntityTag, FundingAgency, 
    FundingAgencyGrant, Notification, CollaborationRequest,
    ProjectResearcher  # <-- KRİTİK: Eksik olan parça mühürlendi!
)

# ---------------------------------------------------------
# 0. INLINE: PROJE İÇİNDE MÜRETTEBAT LİSTESİ 🛰️
# ---------------------------------------------------------
class ProjectResearcherInline(admin.TabularInline):
    """
    Bu parça sayesinde 'Projects' sayfasına girdiğinde 
    alt tarafta mürettebat listesini otonom olarak görebileceksin.
    """
    model = ProjectResearcher
    extra = 1  # Yeni üye eklemek için boş satır sayısı

# ---------------------------------------------------------
# 1. ARAŞTIRMACI (RESEARCHER)
# ---------------------------------------------------------
@admin.register(Researcher)
class ResearcherAdmin(admin.ModelAdmin):
    list_display = ('researcher_id', 'full_name', 'role', 'department', 'email')
    list_display_links = ('full_name',)
    list_filter = ('role', 'department')
    search_fields = ('full_name', 'email')

# ---------------------------------------------------------
# 2. PROJELER (PROJECTS) - GÜNCELLENDİ 🏗️
# ---------------------------------------------------------
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('project_id', 'title', 'status', 'pi', 'created_at')
    list_filter = ('status', 'department')
    search_fields = ('title', 'summary')
    # Mustafa Arslan'ı burada görmek için inline ekledik:
    inlines = [ProjectResearcherInline]

# ---------------------------------------------------------
# 3. İŞBİRLİĞİ TALEPLERİ (COLLABORATION REQUESTS)
# ---------------------------------------------------------
@admin.register(CollaborationRequest)
class CollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'sender', 'receiver', 'project', 'status', 'created_at')
    list_filter = ('status', 'request_type')
    # Admin'den 'Kabul Edildi' yaptığında Signal'i tetikleyen yer burası

# ---------------------------------------------------------
# 4. DİĞERLERİ (BASİT KAYIT)
# ---------------------------------------------------------
@admin.register(ProjectResearcher)
class ProjectResearcherAdmin(admin.ModelAdmin):
    """Mürettebatı bağımsız bir tablo olarak da yönetebilmen için."""
    list_display = ('project', 'researcher', 'role', 'joined_at')
    list_filter = ('role', 'project')

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('department_id', 'name')

admin.site.register(Skill)
admin.site.register(Tag)
admin.site.register(Publication)
admin.site.register(FundingAgency)
admin.site.register(FundingAgencyGrant)
admin.site.register(EntityTag)
admin.site.register(Notification)