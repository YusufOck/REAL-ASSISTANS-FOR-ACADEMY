from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple 
from django.db import connection
from .models import Department, Researcher

# ---------------------------------------------------------
# 0. YAPAY ZEKA MODELİ VE EMBEDDING FONKSİYONU (EKLENDİ)
# ---------------------------------------------------------
try:
    from sentence_transformers import SentenceTransformer
    print("⏳ AI Modeli Yükleniyor...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ AI Modeli Hazır!")
except Exception as e:
    print(f"⚠️ Model yüklenemedi: {e}")
    model = None

def generate_embedding(text):
    """
    Onboard işleminde views.py tarafından ve Shell scripti tarafından çağrılır.
    Metni (Bio + Title) okur ve 384 boyutlu vektör listesi döner.
    """
    if model is None:
        return [0.0] * 384
        
    if not text or len(str(text)) < 5:
        return [0.0] * 384
    
    # Vektörü oluştur ve Python listesine çevir (Postgres array için)
    vector = model.encode(text).tolist()
    return vector

# ---------------------------------------------------------
# 1. VERİ YÜKLEME YARDIMCILARI (MEVCUT KODLARIN)
# ---------------------------------------------------------

def _load_researcher_basic_data():
    """ ID, İsim ve Bölüm verilerini çeker """
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
            "bio": row[4] or ""
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
# 2. HIZLI AI PUANLAYICI (VERİTABANINDAN ÇEKER)
# ---------------------------------------------------------

def _get_ai_scores_from_db(base_researcher_id: int) -> Dict[int, float]:
    """
    Python döngüsü yerine Veritabanındaki Vektörleri (pgvector) kullanır.
    Çok daha hızlıdır.
    Dönüş: {researcher_id: similarity_score, ...}
    """
    ai_scores = {}
    
    # 1. Hedef kişinin vektörünü al
    with connection.cursor() as cursor:
        cursor.execute("SELECT embedding FROM researcher WHERE researcher_id = %s", [base_researcher_id])
        row = cursor.fetchone()
        
        if not row or row[0] is None:
            return {} # Vektör yoksa boş dön
        
        target_vector = row[0] # String formatında vektör

        # 2. Tüm kullanıcılarla karşılaştır
        # (embedding <=> target) mesafe verir. 1 - mesafe = benzerlik.
        sql = """
            SELECT researcher_id, 1 - (embedding <=> %s) as match_score
            FROM researcher
            WHERE researcher_id != %s
            AND embedding IS NOT NULL
        """
        cursor.execute(sql, [target_vector, base_researcher_id])
        rows = cursor.fetchall()
        
        for r_id, score in rows:
            # Negatif skorları temizle
            ai_scores[r_id] = max(0.0, float(score))
            
    return ai_scores

# ---------------------------------------------------------
# 3. ANA ALGORİTMA (HYBRID: GRAPH + FAST SEMANTIC AI)
# ---------------------------------------------------------

def get_collaboration_suggestions(
    base_researcher_id: int,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    
    # A) Verileri Yükle
    researchers = _load_researcher_basic_data()
    if base_researcher_id not in researchers:
        return []

    department_names = _load_department_names()
    base_info = researchers[base_researcher_id]
    base_dept_id = base_info["department_id"]

    researcher_tags, tag_names = _load_researcher_tags()
    researcher_skills, skill_names = _load_researcher_skills()
    network_graph = _load_collaboration_network()

    # B) AI Skorlarını Veritabanından Topluca Çek (HIZLI YÖNTEM) 🚀
    ai_scores_map = _get_ai_scores_from_db(base_researcher_id)

    base_tags = researcher_tags.get(base_researcher_id, set())
    base_skills = researcher_skills.get(base_researcher_id, set())
    base_partners = network_graph.get(base_researcher_id, set())

    base_tag_count = len(base_tags) or 1
    base_skill_count = len(base_skills) or 1

    suggestions = []

    # C) Adayları Tara ve Puanla
    for candidate_id, info in researchers.items():
        if candidate_id == base_researcher_id:
            continue

        # 1. İçerik Skoru (Tag & Skill)
        cand_tags = researcher_tags.get(candidate_id, set())
        cand_skills = researcher_skills.get(candidate_id, set())
        
        common_tag_ids = base_tags.intersection(cand_tags)
        common_skill_ids = base_skills.intersection(cand_skills)
        
        tag_score = len(common_tag_ids) / base_tag_count
        skill_score = len(common_skill_ids) / base_skill_count
        
        # 2. Departman Bonusu
        dept_score = 1.0 if base_dept_id == info["department_id"] else 0.0

        # 3. Network Skoru (Triadic Closure)
        cand_partners = network_graph.get(candidate_id, set())
        common_partners = base_partners.intersection(cand_partners)
        network_score = min(len(common_partners) / 3.0, 1.0)

        # 4. AI Semantic Skor (Veritabanından gelen hazır puan)
        semantic_score = ai_scores_map.get(candidate_id, 0.0)

        # 5. Ağırlıklı Final Skor
        # Formül: %30 Tag + %20 Skill + %10 Dept + %20 Network + %20 AI
        total_score = (0.3 * tag_score) + \
                      (0.2 * skill_score) + \
                      (0.1 * dept_score) + \
                      (0.2 * network_score) + \
                      (0.2 * semantic_score)

        if total_score <= 0.0: # Çok düşükleri ele
            continue

        suggestions.append({
            "researcher_id": candidate_id,
            "full_name": info["full_name"],
            "department_name": department_names.get(info["department_id"], "Unknown"),
            "score": round(float(total_score), 4),
            "reasons": {
                "common_tags": [tag_names[t] for t in common_tag_ids],
                "common_skills": [skill_names[s] for s in common_skill_ids],
                "common_connections": len(common_partners),
                "semantic_match": f"%{int(semantic_score * 100)}" # AI Yüzdesi
            }
        })

    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return suggestions[:limit]