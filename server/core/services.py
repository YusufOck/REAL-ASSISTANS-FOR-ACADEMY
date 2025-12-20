import google.generativeai as genai
import json
from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple 
from django.db import connection
from django.conf import settings
from .models import Department, Researcher
import re

import math

# ---------------------------------------------------------
# 0. YAPAY ZEKA MODELİ (GOOGLE GEMINI API) 🚀
# ---------------------------------------------------------



def analyze_skills_with_gemini(bio_text, department_name="General Academic"):
    if not bio_text or len(str(bio_text)) < 15:
        return {}

    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    try:
        genai.configure(api_key=api_key, transport='rest')
        
        # Listenin en güvenli ismi: gemini-flash-latest
        # Bu isim genellikle en stabil flash modeline (şu an 2.0 veya 2.5) yönlendirir.
        model = genai.GenerativeModel('gemini-flash-latest') 
        
        prompt = f"""
        Analyze the following bio from the perspective of an expert in {department_name}.
        Extract technical/professional skills and assign scores (0-100).
        Return ONLY a JSON object. Example: {{"Skill": 85}}
        Bio: {bio_text}
        """
        
        response = model.generate_content(prompt)
        
        json_match = re.search(r'\{.*\}', response.text.strip(), re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {}

    except Exception as e:
        # KOTA HATASI (429) YAKALAMA
        if "429" in str(e):
            print("⚠️ BİLGİ: Gemini API kotası doldu. İşlem AI analizi olmadan tamamlanıyor.")
        else:
            print(f"⚠️ Gemini Analiz Hatası: {e}")
        return {} # Hata alsa bile boş sözlük dön ki views.py tarafı patlamasın.


def generate_embedding(text):
    """
    Eski yerel model yerine Google Gemini API kullanır.
    Model: models/text-embedding-004
    Çıktı Boyutu: 768
    """
    # 1. Metin kontrolü
    if not text or len(str(text)) < 3:
        # Hata durumunda 768 boyutlu boş vektör dön
        return [0.0] * 768

    # 2. API Anahtarı kontrolü
    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        print("⚠️ HATA: GEMINI_API_KEY settings.py içinde bulunamadı.")
        return [0.0] * 768

    try:
        # 3. Gemini'yi yapılandır
        genai.configure(api_key=api_key)
        
        # 4. İsteği gönder
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
            title="Researcher Bio"
        )
        
        # 5. Vektörü al ve dön
        vector = result['embedding']
        return vector

    except Exception as e:
        print(f"⚠️ Gemini API Hatası: {e}")
        # Hata olursa sistem çökmesin, boş vektör dönsün
        return [0.0] * 768

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
    DİKKAT: Veritabanı artık 768 boyutlu vektör kullanıyor.
    Logic değişmedi, sadece veriler değişti.
    """
    ai_scores = {}
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT embedding FROM researcher WHERE researcher_id = %s", [base_researcher_id])
        row = cursor.fetchone()
        
        if not row or row[0] is None:
            return {}
        
        target_vector = row[0]

        sql = """
            SELECT researcher_id, 1 - (embedding <=> %s) as match_score
            FROM researcher
            WHERE researcher_id != %s
            AND embedding IS NOT NULL
        """
        cursor.execute(sql, [target_vector, base_researcher_id])
        rows = cursor.fetchall()
        
        for r_id, score in rows:
            ai_scores[r_id] = max(0.0, float(score))
            
    return ai_scores

# ---------------------------------------------------------
# 3. ANA ALGORİTMA (HYBRID: GRAPH + FAST SEMANTIC AI)
# ---------------------------------------------------------

# core/services.py
def calculate_cosine_similarity(vec1, vec2):
    # Null kontrolü hayat kurtarır
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    try:
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = math.sqrt(sum(a * a for a in vec1))
        norm_b = math.sqrt(sum(b * b for b in vec2))
        return dot_product / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0.0
    except Exception:
        return 0.0


def _get_all_researcher_skills_json():
    """
    Tüm araştırmacıların yeteneklerini {id: skills_dict} şeklinde döner.
    Döngü içinde her seferinde DB'ye gitmemek için bu veri tek seferde çekilir.
    """
    from .models import Researcher # Circular import'u önlemek için içeride import ediyoruz
    return {r.researcher_id: (r.skills or {}) for r in Researcher.objects.all()}


def get_collaboration_suggestions(base_researcher_id: int, limit: int = 5):
    """
    Dinamik Hibrit Eşleştirme. 
    Sorgu sayısını azaltmak için 'all_skills' haritasını kullanır.
    """
    try:
        # 1. Ana Kullanıcıyı Çek
        base_user = Researcher.objects.get(pk=base_researcher_id)
        
        # 2. Tüm yetenekleri TEK SEFERDE çek (N+1 probleminden kaçış)
        all_skills = _get_all_researcher_skills_json()
        base_skills = all_skills.get(base_researcher_id, {})
        
        # 3. Adayları Çek
        candidates = Researcher.objects.exclude(pk=base_researcher_id)
        
        suggestions = []
        missing_skills = [s for s, p in base_skills.items() if p < 45]

        for cand in candidates:
            # ÖNEMLİ: cand.skills yerine önceden çektiğimiz all_skills haritasını kullanıyoruz!
            cand_skills = all_skills.get(cand.researcher_id, {})
            
            # --- TAMAMLAYICILIK %50 ---
            comp_score = 0.0
            found_reasons = []
            for skill in missing_skills:
                puan = cand_skills.get(skill, 0)
                if puan > 75: 
                    comp_score += (puan / 100.0)
                    found_reasons.append(f"{skill} Uzmanı ({puan} Puan)")

            # --- SEMANTİK UYUM %30 ---
            semantic_score = calculate_cosine_similarity(base_user.embedding, cand.embedding)

            # --- DİSİPLİNLERARASI %20 ---
            dept_bonus = 0.2 if base_user.department_id != cand.department_id else 0.0

            # --- HİBRİT HESAPLAMA ---
            # Tamamlayıcılığı normalize ediyoruz
            norm_comp = (comp_score / (len(missing_skills) or 1))
            total_score = (0.5 * norm_comp) + (0.3 * semantic_score) + (0.2 * dept_bonus)

            if total_score > 0.1:
                suggestions.append({
                    "researcher_id": cand.researcher_id,
                    "full_name": cand.full_name,
                    "department_name": cand.department.name if cand.department else "Unknown",
                    "score": round(float(total_score), 4),
                    "match_reasons": found_reasons[:2],
                    "is_complementary": norm_comp > 0.4
                })

        return sorted(suggestions, key=lambda x: x["score"], reverse=True)[:limit]
    except Exception as e:
        print(f"❌ Eşleştirme Hatası: {e}")
        return []