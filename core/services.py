from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple 
from django.db import connection
from .models import Department, Researcher
# YENİ
try:
    from sentence_transformers import SentenceTransformer, util
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False

# Global değişkeni boş başlatıyoruz
AI_MODEL = None

def load_ai_model():
    """Modeli sadece ihtiyaç anında yükler (Lazy Loading)"""
    global AI_MODEL
    if AI_MODEL is None and AI_AVAILABLE:
        print("⏳ AI Modeli Yükleniyor... (İlk istek)")
        AI_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ AI Modeli Hazır!")
    return AI_MODEL

# ---------------------------------------------------------
# VERİ YÜKLEME YARDIMCILARI
# ---------------------------------------------------------

def _load_researcher_basic_data():
    """ ID, İsim, Bio ve Bölüm verilerini çeker """
    sql = "SELECT researcher_id, full_name, email, department_id, bio FROM researcher"
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
            "bio": row[4] or "" # Bio boşsa boş string yap
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
    network = defaultdict(set)
    
    # Proje ve Yayın Arkadaşlıklarını Birleştir
    sql = """
        SELECT pr1.researcher_id, pr2.researcher_id
        FROM project_researcher pr1
        JOIN project_researcher pr2 ON pr1.project_id = pr2.project_id
        WHERE pr1.researcher_id != pr2.researcher_id
        UNION
        SELECT ap1.researcher_id, ap2.researcher_id
        FROM author_publication ap1
        JOIN author_publication ap2 ON ap1.publication_id = ap2.publication_id
        WHERE ap1.researcher_id != ap2.researcher_id
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        for r1, r2 in cursor.fetchall():
            network[r1].add(r2)
            
    return network

# ---------------------------------------------------------
# ANA ALGORİTMA (HYBRID: GRAPH + SEMANTIC AI)
# ---------------------------------------------------------

def get_collaboration_suggestions(
    base_researcher_id: int,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    
    # 1) Verileri Yükle
    researchers = _load_researcher_basic_data()
    department_names = _load_department_names()
    
    if base_researcher_id not in researchers:
        return []

    base_info = researchers[base_researcher_id]
    base_dept_id = base_info["department_id"]
    base_bio = base_info["bio"]

    researcher_tags, tag_names = _load_researcher_tags()
    researcher_skills, skill_names = _load_researcher_skills()
    network_graph = _load_collaboration_network()

    base_tags = researcher_tags.get(base_researcher_id, set())
    base_skills = researcher_skills.get(base_researcher_id, set())
    base_partners = network_graph.get(base_researcher_id, set())

    base_tag_count = len(base_tags) or 1
    base_skill_count = len(base_skills) or 1

# --- AI SEMANTIC HAZIRLIK ---
    base_embedding = None
    # Önce modeli yüklemeyi dene
    model = load_ai_model() 
    
    if model is not None and base_bio and len(base_bio) > 10:
        base_embedding = model.encode(base_bio, convert_to_tensor=True)

    suggestions = []

    # 2) Adayları Tara
    for candidate_id, info in researchers.items():
        if candidate_id == base_researcher_id:
            continue

        # A. İçerik Skoru (Tag & Skill)
        cand_tags = researcher_tags.get(candidate_id, set())
        cand_skills = researcher_skills.get(candidate_id, set())
        
        common_tag_ids = base_tags.intersection(cand_tags)
        common_skill_ids = base_skills.intersection(cand_skills)
        
        tag_score = len(common_tag_ids) / base_tag_count
        skill_score = len(common_skill_ids) / base_skill_count
        
        # B. Departman Bonusu
        dept_score = 1.0 if base_dept_id == info["department_id"] else 0.0

        # C. Network Skoru (Triadic Closure)
        cand_partners = network_graph.get(candidate_id, set())
        common_partners = base_partners.intersection(cand_partners)
        network_score = min(len(common_partners) / 3.0, 1.0) # 3 ortak arkadaş = Max puan

        # D. AI Semantic Skor
        semantic_score = 0.0
        # model değişkenini kullan
        if base_embedding is not None and info["bio"] and len(info["bio"]) > 10:
            cand_embedding = model.encode(info["bio"], convert_to_tensor=True) 
            similarity = util.cos_sim(base_embedding, cand_embedding)
            semantic_score = float(similarity[0][0])
            # Negatif benzerlikleri 0 yapalım
            semantic_score = max(0.0, semantic_score)

        # 3) Ağırlıklı Final Skor
        # Formül: %30 Tag + %20 Skill + %10 Dept + %20 Network + %20 AI
        total_score = (0.3 * tag_score) + \
                      (0.2 * skill_score) + \
                      (0.1 * dept_score) + \
                      (0.2 * network_score) + \
                      (0.2 * semantic_score)

        if total_score <= 0.1: # Çok düşükleri ele
            continue

        suggestions.append({
            "researcher_id": candidate_id,
            "full_name": info["full_name"],
            "department_name": department_names.get(info["department_id"]),
            "score": round(float(total_score), 4),
            "reasons": {
                "common_tags": [tag_names[t] for t in common_tag_ids],
                "common_skills": [skill_names[s] for s in common_skill_ids],
                "common_connections": len(common_partners),
                "semantic_match": f"%{int(semantic_score * 100)}" # AI ne kadar benzetti?
            }
        })

    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return suggestions[:limit]