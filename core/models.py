from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class Department(models.Model):
    department_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    faculty = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        db_table = 'department'
        
        unique_together = (('name', 'faculty'),)

    def __str__(self):
        return f"{self.code or ''} - {self.name}"


class Researcher(models.Model):
    researcher_id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    email = models.CharField(max_length=150, unique=True)
    title = models.CharField(max_length=100, null=True, blank=True)
    # --- YENİ EKLENENLER ---
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='user_id')
    role = models.CharField(max_length=20, default='student')
    department = models.ForeignKey(
        Department,
        models.SET_NULL,
        db_column='department_id',
        null=True,
        blank=True,
        related_name='researchers',
    )
    bio = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'researcher'
        

    def __str__(self):
        return self.full_name


class Project(models.Model):
    project_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20)  # planned, active, completed
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    pi = models.ForeignKey(
        Researcher,
        models.PROTECT,
        db_column='pi_id',
        related_name='projects_as_pi',
    )

    department = models.ForeignKey(
        Department,
        models.SET_NULL,
        db_column='department_id',
        null=True,
        blank=True,
        related_name='projects',
    )

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'project'
       

    def __str__(self):
        return self.title


class ProjectResearcher(models.Model):
    id = models.AutoField(primary_key=True) 

    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        db_column="project_id",
        related_name='project_memberships'
    )
    researcher = models.ForeignKey(
        "Researcher",
        on_delete=models.CASCADE,
        db_column="researcher_id",
    )
    role = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Projede üstlendiği rol (PI, co-author, researcher vs.)"
    )
    
    # Bu alanlar veritabanında var, modelde de kesin olmalı
    contribution_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    joined_at = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "project_researcher"
        unique_together = ("project", "researcher")
        # managed = False satırını SİLDİK! Artık Django patron.

    def __str__(self):
        return f"{self.project.title} - {self.researcher.full_name}"



class Publication(models.Model):
    publication_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    venue = models.CharField(max_length=200, null=True, blank=True)
    year = models.IntegerField(null=True, blank=True)
    doi = models.CharField(max_length=100, null=True, blank=True)

    # 🔹 EKLEMEN GEREKEN ALAN 1
    publication_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="journal / conference / thesis gibi tür bilgisi"
    )

    # 🔹 EKLEMEN GEREKEN ALAN 2
    main_author = models.ForeignKey(
        "Researcher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="main_publications",
        help_text="Bu yayının ana yazarı"
    )

    project = models.ForeignKey(
        Project,
        models.SET_NULL,
        db_column='project_id',
        null=True,
        blank=True,
        related_name='publications',
    )

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'publication'
        

    def __str__(self):
        return self.title


class AuthorPublication(models.Model):
    publication = models.ForeignKey(
        "Publication",
        on_delete=models.CASCADE,
        db_column="publication_id",
    )
    researcher = models.ForeignKey(
        "Researcher",
        on_delete=models.CASCADE,
        db_column="researcher_id",
    )
    author_order = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Yayındaki yazar sırası (1 = birinci yazar, 2 = ikinci vb.)"
    )

    class Meta:
        db_table = "author_publication"
        unique_together = ("publication", "researcher")



class FundingAgency(models.Model):
    funding_agency_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, unique=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    website = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'funding_agency'
        

    def __str__(self):
        return self.name


class FundingAgencyGrant(models.Model):
    grant_id = models.AutoField(primary_key=True)

    project = models.ForeignKey(
        Project,
        models.CASCADE,
        db_column='project_id',
        related_name='funding_grants',
    )

    funding_agency = models.ForeignKey(
        FundingAgency,
        models.PROTECT,
        db_column='funding_agency_id',
        related_name='grants',
    )

    program_name = models.CharField(max_length=200, null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=10, default='TRY')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'funding_agency_grant'
        
        unique_together = (('project', 'funding_agency', 'program_name'),)

    def __str__(self):
        return f"{self.project} - {self.funding_agency} - {self.program_name or ''}"


class Tag(models.Model):
    tag_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
   
    class Meta:
        db_table = 'tag'
       

    def __str__(self):
        return self.name


class EntityTag(models.Model):
    entity_tag_id = models.AutoField(primary_key=True)
    entity_type = models.CharField(max_length=30)   # researcher / project / publication
    entity_id = models.IntegerField()
    tag = models.ForeignKey(
        Tag,
        models.CASCADE,
        db_column='tag_id',
        related_name='entity_links',
    )

    class Meta:
        db_table = 'entity_tag'
        
        unique_together = (('entity_type', 'entity_id', 'tag'),)

    def __str__(self):
        return f"{self.entity_type}({self.entity_id}) -> {self.tag.name}"


class Skill(models.Model):
    skill_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'skill'
        

    def __str__(self):
        return self.name


class ResearcherSkill(models.Model):
    researcher = models.ForeignKey(
        "Researcher",
        on_delete=models.CASCADE,
        db_column="researcher_id",
    )
    skill = models.ForeignKey(
        "Skill",
        on_delete=models.CASCADE,
        db_column="skill_id",
    )

    # 🔹 YENİ ALAN: skill seviyesi (1–5 arası gibi düşünebilirsin)
    level = models.PositiveSmallIntegerField(
        default=3,
        help_text="Araştırmacının bu skilldeki seviyesi (1-5 arası)"
    )

    class Meta:
        db_table = "researcher_skill"
        unique_together = ("researcher", "skill")
