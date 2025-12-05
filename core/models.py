from django.db import models
from django.utils import timezone


class Department(models.Model):
    department_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    faculty = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        db_table = 'department'
        managed = False
        unique_together = (('name', 'faculty'),)

    def _str_(self):
        return f"{self.code or ''} - {self.name}"


class Researcher(models.Model):
    researcher_id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    email = models.CharField(max_length=150, unique=True)
    title = models.CharField(max_length=100, null=True, blank=True)
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
        managed = False

    def _str_(self):
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
        managed = False

    def _str_(self):
        return self.title


class Publication(models.Model):
    publication_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    venue = models.CharField(max_length=200, null=True, blank=True)
    year = models.IntegerField(null=True, blank=True)
    doi = models.CharField(max_length=100, null=True, blank=True)

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
        managed = False

    def _str_(self):
        return self.title


class FundingAgency(models.Model):
    funding_agency_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, unique=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    website = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'funding_agency'
        managed = False

    def _str_(self):
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
        managed = False
        unique_together = (('project', 'funding_agency', 'program_name'),)

    def _str_(self):
        return f"{self.project} - {self.funding_agency} - {self.program_name or ''}"


class Tag(models.Model):
    tag_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'tag'
        managed = False

    def _str_(self):
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
        managed = False
        unique_together = (('entity_type', 'entity_id', 'tag'),)

    def _str_(self):
        return f"{self.entity_type}({self.entity_id}) -> {self.tag.name}"


class Skill(models.Model):
    skill_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'skill'
        managed = False

    def _str_(self):
        return self.name