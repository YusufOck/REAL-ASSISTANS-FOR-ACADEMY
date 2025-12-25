import google.generativeai as genai
import json
from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple 
from django.db import connection
from django.conf import settings
from .models import Department, Researcher
import re
import sys
import math




# ---------------------------------------------------------
# 0. YAPAY ZEKA MODELİ (GOOGLE GEMINI API) 🚀
# ---------------------------------------------------------



 

def generate_embedding(text):
    """Metni Gemini API kullanarak vektöre (embedding) çevirir."""
    if not text:
        return None
    
    try:
        # Settings'deki API anahtarını kullanıyoruz
        genai.configure(api_key=settings.GEMINI_API_KEY)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"❌ Embedding Üretme Hatası: {e}")
        return None

# Diğer fonksiyonların (calculate_cosine_similarity vb.) burada devam etsin...




def analyze_skills_with_gemini(bio_text, department_name="General Academic"):
    """
    Gemini ham yanıtını Render loglarında mühürlemek için optimize edilmiş sürüm.
   
    """
    # 1. ÖN KONTROL
    if not bio_text or len(str(bio_text).strip()) < 10:
        print(f"⚠️ DEBUG [AI]: Bio çok kısa veya boş. İşlem iptal. Bio: '{bio_text}'", flush=True)
        return {}, "Bio too short"

    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        print("❌ DEBUG [AI]: GEMINI_API_KEY bulunamadı! Render Env Vars kontrol edilmeli.", flush=True)
        return {}, "Missing API Key"

    try:
        genai.configure(api_key=api_key, transport='rest')
        model = genai.GenerativeModel('gemini-flash-latest') 
        
        # Daha esnek ama JSON odaklı prompt
        prompt = f"""
        Act as a technical recruiter. Analyze this bio from {department_name}:
        '{bio_text}'
        
        Extract skills and scores (0-100). 
        Return ONLY a JSON object like {{"SkillName": 80}}. 
        If nothing found, return {{}}.
        """
        
        response = model.generate_content(prompt)
        
        # 🛡️ HAM VERİ YAKALAMA (En kritik nokta)
        try:
            raw_text = response.text.strip()
            # BU SATIR RENDER LOGLARINDA GÖRÜNECEK ANA SATIRDIR
            print(f"🔍 [AI HAM YANIT]: {raw_text}", flush=True) 
        except ValueError:
            # Eğer güvenlik filtresi (Safety Settings) tetiklenirse .text okunamaz
            safety_feedback = str(response.prompt_feedback)
            print(f"⚠️ DEBUG [AI]: Güvenlik engeline takıldı! Feedback: {safety_feedback}", flush=True)
            return {}, f"Blocked by safety: {safety_feedback}"

        # 🛡️ ÇİFT KİLİT PARSING
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            try:
                parsed_json = json.loads(json_match.group(0))
                print(f"✅ DEBUG [AI]: Başarıyla parse edildi. Skill sayısı: {len(parsed_json)}", flush=True)
                return parsed_json, raw_text
            except json.JSONDecodeError as je:
                print(f"⚠️ DEBUG [AI]: JSON Formatı bozuk: {je}", flush=True)
                return {}, raw_text
        
        print("⚠️ DEBUG [AI]: Yanıt içinde süslü parantez {{}} bulunamadı.", flush=True)
        return {}, raw_text

    except Exception as e:
        print(f"❌ DEBUG [AI]: Genel Sistem Hatası: {str(e)}", flush=True)
        return {}, str(e)


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