from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple 
from django.db import connection
from .models import Department, Researcher

# ---------------------------------------------------------
# VERİ YÜKLEME YARDIMCILARI (DATA LOADERS)
# ---------------------------------------------------------

def _load_researcher_basic_data():
    """ Tüm araştırmacıların temel bilgilerini çeker. """
    sql = "SELECT researcher_id, full_name, email, department_id FROM researcher"
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    researchers = {}
    for row in rows:
        researchers[row[0]] = {
            "researcher_id": row[0],
            "full_name": row[1],
            "email": row[2],
            "department_id": row[3],
        }
    return researchers

def _load_department_names() -> Dict[int, str]:
    data = {}
    for dept in Department.objects.all():
        data[dept.department_id] = dept.name
    return data

def _load_researcher_tags() -> Tuple[Dict[int, Set[int]], Dict[int, str]]:
    researcher_tags = defaultdict(set)
    tag_names = {}
    sql = """
        SELECT et.entity_id, t.tag_id, t.name
        FROM entity_tag et
        JOIN tag t ON t.tag_id = et.tag_id
        WHERE et.entity_type = 'researcher'
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()
    
    for r_id, t_id, t_name in rows:
        researcher_tags[r_id].add(t_id)
        tag_names[t_id] = t_name
    return researcher_tags, tag_names

def _load_researcher_skills() -> Tuple[Dict[int, Set[int]], Dict[int, str]]:
    researcher_skills = defaultdict(set)
    skill_names = {}
    sql = """
        SELECT rs.researcher_id, s.skill_id, s.name
        FROM researcher_skill rs
        JOIN skill s ON s.skill_id = rs.skill_id
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    for r_id, s_id, s_name in rows:
        researcher_skills[r_id].add(s_id)
        skill_names[s_id] = s_name
    return researcher_skills, skill_names

def _load_collaboration_network() -> Dict[int, Set[int]]:
    """
    Kimin kiminle çalıştığını (Network Graph) hafızaya yükler.
    Çıktı: {ResearcherID: {Partner1, Partner2, ...}}
    """
    network = defaultdict(set)
    
    # 1. Proje Arkadaşlıkları
    sql_projects = """
        SELECT pr1.researcher_id, pr2.researcher_id
        FROM project_researcher pr1
        JOIN project_researcher pr2 ON pr1.project_id = pr2.project_id
        WHERE pr1.researcher_id != pr2.researcher_id
    """
    
    # 2. Yayın Arkadaşlıkları
    sql_pubs = """
        SELECT ap1.researcher_id, ap2.researcher_id
        FROM author_publication ap1
        JOIN author_publication ap2 ON ap1.publication_id = ap2.publication_id
        WHERE ap1.researcher_id != ap2.researcher_id
    """

    with connection.cursor() as cursor:
        # Projeleri işle
        cursor.execute(sql_projects)
        for r1, r2 in cursor.fetchall():
            network[r1].add(r2)
            
        # Yayınları işle
        cursor.execute(sql_pubs)
        for r1, r2 in cursor.fetchall():
            network[r1].add(r2)
            
    return network

# ---------------------------------------------------------
# ANA ALGORİTMA (GRAPH AWARE)
# ---------------------------------------------------------

def get_collaboration_suggestions(
    base_researcher_id: int,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    
    # 1) Verileri Hafızaya Çek
    researchers = _load_researcher_basic_data()
    department_names = _load_department_names()
    
    if base_researcher_id not in researchers:
        return []

    base_info = researchers[base_researcher_id]
    base_dept_id = base_info["department_id"]

    researcher_tags, tag_names = _load_researcher_tags()
    researcher_skills, skill_names = _load_researcher_skills()
    network_graph = _load_collaboration_network() # <--- YENİ: Ağı yükle

    # Hedef kişinin profili
    base_tags = researcher_tags.get(base_researcher_id, set())
    base_skills = researcher_skills.get(base_researcher_id, set())
    base_partners = network_graph.get(base_researcher_id, set()) # <--- Kişinin tanıdıkları

    base_tag_count = len(base_tags) or 1
    base_skill_count = len(base_skills) or 1

    suggestions = []

    # 2) Adayları Tara
    for candidate_id, info in researchers.items():
        if candidate_id == base_researcher_id:
            continue

        # A. İçerik Benzerliği (Tag & Skill)
        cand_tags = researcher_tags.get(candidate_id, set())
        cand_skills = researcher_skills.get(candidate_id, set())
        
        common_tag_ids = base_tags.intersection(cand_tags)
        common_skill_ids = base_skills.intersection(cand_skills)
        
        tag_score = len(common_tag_ids) / base_tag_count
        skill_score = len(common_skill_ids) / base_skill_count
        
        # B. Departman Bonusu
        dept_score = 1.0 if base_dept_id == info["department_id"] else 0.0

        # C. Network Skoru (Ortak Tanıdıklar) - YENİ ÖZELLİK 🕸️
        cand_partners = network_graph.get(candidate_id, set())
        
        # Zaten tanışıyorlarsa (doğrudan bağlantı varsa) network skorunu düşük tutabiliriz
        # Amaç yeni kişiler önermek. Ama yine de güçlü bağ iyidir.
        already_connected = candidate_id in base_partners
        
        # Ortak arkadaş sayısı (Intersection of Neighbors)
        common_partners = base_partners.intersection(cand_partners)
        common_partner_count = len(common_partners)
        
        # Network skoru normalizasyonu (Basitçe: 3 ortak arkadaş = Tam puan gibi scale edelim)
        network_score = min(common_partner_count / 3.0, 1.0)

        # 3) Ağırlıklı Toplam Skor Hesapla
        # Formül: %40 Tag + %20 Skill + %10 Dept + %30 Network
        total_score = (0.4 * tag_score) + \
                      (0.2 * skill_score) + \
                      (0.1 * dept_score) + \
                      (0.3 * network_score)

        if total_score <= 0:
            continue

        suggestions.append({
            "researcher_id": candidate_id,
            "full_name": info["full_name"],
            "department_name": department_names.get(info["department_id"]),
            "score": round(float(total_score), 4),
            "reasons": {
                "common_tags": [tag_names[t] for t in common_tag_ids],
                "common_skills": [skill_names[s] for s in common_skill_ids],
                "common_connections_count": common_partner_count, # <--- JSON'a ekledik
                "already_connected": already_connected
            }
        })

    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return suggestions[:limit]