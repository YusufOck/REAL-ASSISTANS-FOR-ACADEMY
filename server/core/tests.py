# core/tests.py

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from django.utils import timezone

from core.models import (
    Department,
    Researcher,
    Tag,
    Skill,
    EntityTag,
    Project,
    Publication,
    FundingAgency,
    FundingAgencyGrant,
)
from core.services import get_collaboration_suggestions


class BaseAPITestCase(APITestCase):
    """
    Tüm API testleri için ortak kurulum.
    Burada minimum dummy data oluşturuyoruz:
      - 1 bölüm
      - 2-3 skill
      - 2-3 tag
      - 2-3 araştırmacı
    """

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        # Bölüm
        self.dept_ceng = Department.objects.create(
            name="Computer Engineering",
            code="CENG",
            faculty="Engineering Faculty",
        )

        # Skill'ler
        self.skill_python = Skill.objects.create(name="Python")
        self.skill_matlab = Skill.objects.create(name="MATLAB")

        # Tag'ler
        self.tag_uav = Tag.objects.create(name="UAV")
        self.tag_forest = Tag.objects.create(name="Forest Fire Detection")
        self.tag_ai = Tag.objects.create(name="Deep Learning")

        # Araştırmacılar
        self.researcher_ali = Researcher.objects.create(
            full_name="Ali Yılmaz",
            email="ali@example.com",
            title="Dr.",
            department=self.dept_ceng,
            bio="Working on UAV and forest fire detection with deep learning.",
        )

        self.researcher_ayse = Researcher.objects.create(
            full_name="Ayşe Demir",
            email="ayse@example.com",
            title="Asst. Prof.",
            department=self.dept_ceng,
            bio="Interested in signal processing and UAV systems.",
        )

        self.researcher_sadik = Researcher.objects.create(
            full_name="Sadık Can Güler",
            email="sadik@example.com",
            title="Student",
            department=self.dept_ceng,
            bio="Database systems, web development, UAV.",
        )

       

        # NOT: ResearcherSkill modeli ORM'de yoksa, skill ilişkilerini
        # sadece API ile (/api/researchers/{id}/skills/) test edeceğiz.


class ResearcherOnboardAPITests(BaseAPITestCase):
    """
    /api/researchers/onboard/ endpoint'ini test eder.
    - Doğru durumda 201 dönüyor mu?
    - Araştırmacı gerçekten oluşuyor mu?
    - Skiller ve tagler atanıyor mu?
    - Öneri listesi dönüyor mu?
    """

    def test_onboard_creates_researcher_and_relations(self):
        url = "/api/researchers/onboard/"

        payload = {
            "full_name": "New AI Collaborator",
            "email": "ai.collab@example.com",
            "department_id": self.dept_ceng.department_id,
            "title": "Res. Asst.",
            "bio": "Interested in UAV, forest fire detection and Python.",
            "skill_ids": [self.skill_python.skill_id, self.skill_matlab.skill_id],
            "tag_ids": [self.tag_uav.tag_id, self.tag_ai.tag_id],
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            msg=f"Onboard endpoint 201 yerine {response.status_code} döndü: {response.data}",
        )

        data = response.data
        self.assertIn("new_researcher", data, "Onboard cevabında 'new_researcher' alanı yok.")
        self.assertIn("collaboration_suggestions", data, "Onboard cevabında 'collaboration_suggestions' alanı yok.")

        new_id = data["new_researcher"]["id"]
        self.assertTrue(
            Researcher.objects.filter(researcher_id=new_id).exists(),
            "Onboard sonrası Researcher veritabanına eklenmemiş gibi görünüyor.",
        )

        # Araştırmacının skill'leri API üzerinden geliyor mu? (GET /api/researchers/{id}/skills/)
        skills_url = f"/api/researchers/{new_id}/skills/"
        skills_resp = self.client.get(skills_url, format="json")
        self.assertEqual(
            skills_resp.status_code,
            status.HTTP_200_OK,
            msg=f"/skills endpoint'i 200 yerine {skills_resp.status_code} döndü: {skills_resp.data}",
        )
        self.assertGreaterEqual(
            len(skills_resp.data),
            1,
            "Onboard sonrası /skills endpoint'inde herhangi bir skill görünmüyor.",
        )

        # EntityTag üzerinden tag ilişkilerini kontrol edelim
        tag_count = EntityTag.objects.filter(entity_type="researcher", entity_id=new_id).count()
        self.assertGreaterEqual(
            tag_count,
            1,
            "Onboard sonrası EntityTag tablosunda bu araştırmacı için tag kaydı yok.",
        )


class ResearcherCollaborationSuggestionTests(BaseAPITestCase):
    """
    /api/researchers/{id}/collaboration-suggestions/ endpoint'i ve
    core.services.get_collaboration_suggestions fonksiyonunu test eder.
    """

    def test_service_function_returns_candidates(self):
        """
        core.services.get_collaboration_suggestions doğrudan çağrıldığında
        anlamlı bir sonuç veriyor mu?
        """
        suggestions = get_collaboration_suggestions(self.researcher_ali.researcher_id, limit=10)

        # Fonksiyon en azından çalışabilmeli, hata atmamalı.
        self.assertIsInstance(suggestions, list, "get_collaboration_suggestions bir liste döndürmedi.")

    def test_api_collaboration_suggestions_endpoint(self):
        """
        GET /api/researchers/{id}/collaboration-suggestions/
        endpoint'ini test eder.
        """
        url = f"/api/researchers/{self.researcher_ali.researcher_id}/collaboration-suggestions/?limit=5"

        response = self.client.get(url, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg=f"collaboration-suggestions endpoint'i 200 yerine {response.status_code} döndü: {response.data}",
        )

        self.assertIsInstance(
            response.data,
            list,
            "collaboration-suggestions cevabı liste formatında değil.",
        )

        # Eğer dummy datan yeterince zenginse, burada en az 1 öneri bekleyebilirsin.
        # Şimdilik sadece her kaydın içinde beklenen alanlar var mı ona bakalım.
        if response.data:
            sample = response.data[0]
            for key in ["researcher_id", "full_name", "score"]:
                self.assertIn(
                    key,
                    sample,
                    msg=f"Öneri kaydında '{key}' alanı yok. Cevap: {sample}",
                )
            self.assertIn(
                "reasons",
                sample,
                msg=f"Öneri kaydında 'reasons' alanı yok. Cevap: {sample}",
            )


class ResearcherAutoTagSignalTests(TestCase):
    """
    core/signals.py içindeki auto_tag_researcher sinyalini test eder.
    Araştırmacı kaydedildiğinde, bio içerisinde geçen Tag'lerin otomatik
    olarak EntityTag tablosuna yansıyıp yansımadığını kontrol eder.
    """

    def setUp(self):
        self.dept = Department.objects.create(name="Test Dept")
        self.tag_uav = Tag.objects.create(name="UAV")

    def test_auto_tag_researcher_from_bio(self):
        bio_text = "I am working on UAV systems and autonomous flight."
        r = Researcher.objects.create(
            full_name="Signal Test User",
            email="signal@example.com",
            department=self.dept,
            bio=bio_text,
        )

        # Eğer sinyal doğru bağlandıysa, EntityTag'de 'UAV' tag'i otomatik oluşmalı
        tags = EntityTag.objects.filter(entity_type="researcher", entity_id=r.researcher_id)
        tag_names = [t.tag.name for t in tags]

        self.assertIn(
            "UAV",
            tag_names,
            msg=(
                "Otomatik etiketleme çalışmıyor gibi görünüyor. "
                "Researcher bio'sunda 'UAV' geçiyor ama EntityTag tablosunda bulunamadı."
            ),
        )


class DashboardAPITests(BaseAPITestCase):
    """
    /api/dashboard/... endpoint'lerini test eder.
    Burada amaç, en azından endpoint'lerin 200 dönmesi ve beklenen ana alanların
    mevcut olmasıdır.
    """

    def setUp(self):
        super().setUp()

        # Dashboard için minimum proje ve fon bilgisi oluşturalım
        self.project = Project.objects.create(
            title="UAV Fire Detection",
            summary="Test project for dashboard.",
            status="active",
            start_date=timezone.now().date(),
            end_date=None,
            department=self.dept_ceng,
            pi=self.researcher_ali,
        )

        self.pub = Publication.objects.create(
            title="Test Publication",
            publication_type="journal",
            year=2024,
            project=self.project,
            main_author=self.researcher_ali,
        )

        self.agency = FundingAgency.objects.create(
            name="TÜBİTAK",
        )

        self.grant = FundingAgencyGrant.objects.create(
            project=self.project,
            funding_agency=self.agency,
            program_name="TÜBİTAK 1501",
            amount=250000,
            currency="TRY",
            start_date=timezone.now().date(),
            end_date=None,
        )

    def test_general_stats(self):
        url = "/api/dashboard/general-stats/"

        resp = self.client.get(url, format="json")
        self.assertEqual(
            resp.status_code,
            status.HTTP_200_OK,
            msg=f"/dashboard/general-stats 200 yerine {resp.status_code} döndü: {resp.data}",
        )

        for key in ["total_researchers", "total_projects", "total_publications"]:
            self.assertIn(
                key,
                resp.data,
                msg=f"general-stats cevabında '{key}' alanı yok. Cevap: {resp.data}",
            )

    def test_department_distribution(self):
        url = "/api/dashboard/department-distribution/"

        resp = self.client.get(url, format="json")
        self.assertEqual(
            resp.status_code,
            status.HTTP_200_OK,
            msg=f"/dashboard/department-distribution 200 yerine {resp.status_code} döndü: {resp.data}",
        )
        self.assertIsInstance(
            resp.data,
            list,
            "department-distribution cevabı liste değil.",
        )

    def test_top_skills(self):
        url = "/api/dashboard/top-skills/"

        resp = self.client.get(url, format="json")
        self.assertEqual(
            resp.status_code,
            status.HTTP_200_OK,
            msg=f"/dashboard/top-skills 200 yerine {resp.status_code} döndü: {resp.data}",
        )
        self.assertIsInstance(
            resp.data,
            list,
            "top-skills cevabı liste değil.",
        )


class NetworkAPITests(BaseAPITestCase):
    """
    /api/network/ endpoint'ini test eder.
    """

    def test_network_structure(self):
        url = "/api/network/"

        resp = self.client.get(url, format="json")
        self.assertEqual(
            resp.status_code,
            status.HTTP_200_OK,
            msg=f"/network 200 yerine {resp.status_code} döndü: {resp.data}",
        )

        self.assertIn("nodes", resp.data, "network cevabında 'nodes' alanı yok.")
        self.assertIn("edges", resp.data, "network cevabında 'edges' alanı yok.")

        self.assertIsInstance(resp.data["nodes"], list, "'nodes' alanı liste değil.")
        self.assertIsInstance(resp.data["edges"], list, "'edges' alanı liste değil.")
