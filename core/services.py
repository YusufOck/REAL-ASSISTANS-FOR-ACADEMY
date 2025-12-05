from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple 
from django.db import connection
from .models import Department, Researcher # Modellerin import edildiğinden emin ol

def _load_researcher_basic_data():
    """
    Tüm araştırmacıların temel bilgilerini tek seferde çeker:
    researcher_id, full_name, email, department_id
    """
    sql = """
        SELECT researcher_id, full_name, email, department_id
        FROM researcher
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    researchers = {}
    for row in rows:
        r_id, name, email, dept_id = row
        researchers[r_id] = {
            "researcher_id": r_id,
            "full_name": name,
            "email": email,
            "department_id": dept_id,
        }
    return researchers


def _load_department_names() -> Dict[int, str]:
    """
    department_id -> department_name sözlüğü
    """
    data = {}
    for dept in Department.objects.all():
        data[dept.department_id] = dept.name
    return data


def _load_researcher_tags() -> Tuple[Dict[int, Set[int]], Dict[int, str]]:
    """
    Her araştırmacı için tag_id kümesini ve tag_id -> tag_name sözlüğünü döner.
    """
    researcher_tags = defaultdict(set)
    tag_names: Dict[int, str] = {}

    # RAW SQL: entity_tag tablosundan researcher olanları çek
    sql = """
        SELECT et.entity_id, t.tag_id, t.name
        FROM entity_tag et
        JOIN tag t ON t.tag_id = et.tag_id
        WHERE et.entity_type = 'researcher'
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()
    
    for row in rows:
        r_id, tag_id, tag_name = row
        researcher_tags[r_id].add(tag_id)
        tag_names[tag_id] = tag_name

    return researcher_tags, tag_names


def _load_researcher_skills() -> Tuple[Dict[int, Set[int]], Dict[int, str]]:
    """
    Her araştırmacı için skill_id kümesini ve skill_id -> skill_name sözlüğünü döner.
    """
    researcher_skills = defaultdict(set)
    skill_names: Dict[int, str] = {}

    # RAW SQL: researcher_skill tablosunu çek
    sql = """
        SELECT rs.researcher_id, s.skill_id, s.name
        FROM researcher_skill rs
        JOIN skill s ON s.skill_id = rs.skill_id
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    for row in rows:
        r_id, s_id, s_name = row
        researcher_skills[r_id].add(s_id)
        skill_names[s_id] = s_name

    return researcher_skills, skill_names


def get_collaboration_suggestions(
    base_researcher_id: int,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Belirli bir araştırmacı için (base_researcher_id),
    tag, skill ve department benzerliğine göre en uygun işbirliği adaylarını döner.
    """

    # 1) Temel verileri yükle
    researchers = _load_researcher_basic_data()
    department_names = _load_department_names()

    if base_researcher_id not in researchers:
        return []

    base_info = researchers[base_researcher_id]
    base_department_id = base_info["department_id"]

    # 2) Tüm araştırmacılar için tag ve skill profillerini yükle
    researcher_tags, tag_names = _load_researcher_tags()
    researcher_skills, skill_names = _load_researcher_skills()

    base_tags = researcher_tags.get(base_researcher_id, set())
    base_skills = researcher_skills.get(base_researcher_id, set())

    # 0'a bölmeyi önlemek için
    base_tag_count = len(base_tags) if len(base_tags) > 0 else 1
    base_skill_count = len(base_skills) if len(base_skills) > 0 else 1

    suggestions = []

    # 3) Tüm adayları dolaş (kendisi hariç)
    for candidate_id, info in researchers.items():
        if candidate_id == base_researcher_id:
            continue

        candidate_tags = researcher_tags.get(candidate_id, set())
        candidate_skills = researcher_skills.get(candidate_id, set())
        candidate_dept_id = info["department_id"]

        # Kesişim (Ortak olanlar)
        common_tag_ids = base_tags.intersection(candidate_tags)
        common_skill_ids = base_skills.intersection(candidate_skills)

        tag_overlap = len(common_tag_ids)
        skill_overlap = len(common_skill_ids)

        # Hiçbir ortak nokta yoksa ve departman farklıysa atla
        if tag_overlap == 0 and skill_overlap == 0 and base_department_id != candidate_dept_id:
            continue

        # Skor Hesaplama
        tag_score = tag_overlap / base_tag_count
        skill_score = skill_overlap / base_skill_count
        dept_score = 1.0 if (base_department_id == candidate_dept_id) else 0.0

        total_score = (0.5 * tag_score) + (0.3 * skill_score) + (0.2 * dept_score)

        if total_score <= 0:
            continue

        # Ortak tag/skill isimleri
        common_tag_names = [tag_names[t_id] for t_id in common_tag_ids]
        common_skill_names = [skill_names[s_id] for s_id in common_skill_ids]

        suggestions.append({
            "researcher_id": candidate_id,
            "full_name": info["full_name"],
            "email": info["email"],
            "department_id": candidate_dept_id,
            "department_name": department_names.get(candidate_dept_id),
            "score": round(float(total_score), 4),
            "same_department": bool(dept_score),
            "common_tags": sorted(common_tag_names),
            "common_skills": sorted(common_skill_names),
        })

    # 4) Sıralama ve Limit
    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return suggestions[:limit]