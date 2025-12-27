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
    🚀 HIZLI ERİŞİM: Sadece gerekli kolonları çekerek belleği korur.
    """
    from .models import Researcher
    # Sadece ID ve Skills kolonlarını çekiyoruz (Ağır embedding ve bio kolonlarını almıyoruz)
    return {
        r['researcher_id']: (r['skills'] or {}) 
        for r in Researcher.objects.values('researcher_id', 'skills')
    }


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
    


# core/services.py içine ekle:

def get_project_specific_suggestions(project_id, limit=5):
    """
    🧠 PROJE ODAKLI HİBRİT ALGORİTMA:
    Proje gereksinimlerini aday araştırmacıların yetenek ve biyografileriyle kıyaslar.
    """
    from .models import Project, Researcher
    
    try:
        project = Project.objects.get(pk=project_id)
        candidates = Researcher.objects.exclude(researcher_id=project.pi_id)
        
        # Proje gereksinim metnini analiz için küçük harfe çevir
        req_text = (project.requirements or "").lower()
        scored_results = []

        for cand in candidates:
            # 1. SEMANTİK UYUM (%50): Proje vektörü ile Araştırmacı vektörü kıyaslanır
            vector_score = calculate_cosine_similarity(project.embedding, cand.embedding)
            # Normalizasyon: 0.5-1.0 aralığını 0-1 arasına çekerek farkı keskinleştir
            norm_vector = max(0, (vector_score - 0.5) * 2) 

            # 2. YETENEK UYUMU (%40): Gereksinimlerde geçen kelimelerin yeteneklerle eşleşmesi
            skill_overlap = 0
            cand_skills = (cand.skills or {})
            for skill_name in cand_skills.keys():
                if skill_name.lower() in req_text:
                    skill_overlap += 1
            skill_score = min(1.0, skill_overlap / 3) # En az 3 yetenek eşleşirse tam puan

            # 3. AKADEMİK/DEPARTMAN UYUMU (%10): Aynı uzmanlık alanındalarsa bonus
            dept_bonus = 1.0 if project.department_id == cand.department_id else 0.0

            # TOPLAM SKOR HESAPLAMA
            total_score = (norm_vector * 50) + (skill_score * 40) + (dept_bonus * 10)
            final_score = round(max(0, min(99.8, total_score)), 1)

            if final_score > 20: # Barajı biraz yükselttik
                scored_results.append({
                    "researcher_id": cand.researcher_id,
                    "full_name": cand.full_name,
                    "department_name": cand.department.name if cand.department else "General",
                    "score": final_score,
                    "match_reasons": [
                        "Yüksek Teknik Uyumluluk" if norm_vector > 0.7 else None,
                        f"{skill_overlap} Kritik Yetenek Eşleşmesi" if skill_overlap > 0 else None,
                        "Alan Uzmanlığı Benzerliği" if dept_bonus > 0 else None
                    ]
                })

        # Match reasons temizliği ve sıralama
        for r in scored_results:
            r["match_reasons"] = [m for m in r["match_reasons"] if m]

        return sorted(scored_results, key=lambda x: x["score"], reverse=True)[:limit]
    except Exception as e:
        print(f"❌ Proje Öneri Hatası: {e}")
        return []
  # server/core/services.py
def extract_skills_from_bio_task(researcher_id, bio_text):
    from .models import Researcher, Skill, ResearcherSkill
    from django.db import transaction
    import logging

    logger = logging.getLogger(__name__)
    researcher = None 

    try:
        # 1. Önce nesneyi çekiyoruz
        researcher = Researcher.objects.get(pk=researcher_id)
        
        # 2. ANALİZ BAŞLADI: Sadece 'is_analyzing' alanını güncelle (Döngüye girmez)
        researcher.is_analyzing = True
        researcher.save(update_fields=['is_analyzing'])
        
        # 3. AI ANALİZİ (Gemini Brain)
        extracted_skills, raw_response = analyze_skills_with_gemini(bio_text)
        print(f"🔍 [AI HAM YANIT]: {raw_response}", flush=True)

        if not extracted_skills:
            return

        # 4. VEKTÖR ÜRETİMİ
        new_embedding = generate_embedding(bio_text)
        
        with transaction.atomic():
            # 5. VERİ GÜNCELLEME: Sadece gerekli alanları mühürle
            # 🚀 KRİTİK: update_fields kullanarak sonsuz döngüyü (SIGKILL) durduruyoruz.
            researcher.skills = extracted_skills
            update_list = ['skills']
            
            if new_embedding:
                researcher.embedding = new_embedding
                update_list.append('embedding')
            
            # Tüm modeli değil, sadece AI sonuçlarını kaydet
            researcher.save(update_fields=update_list)

            # 6. İLİŞKİSEL TABLO GÜNCELLEME
            for s_name, score in extracted_skills.items():
                skill, _ = Skill.objects.get_or_create(
                    name__iexact=s_name,
                    defaults={'name': s_name}
                )
                ResearcherSkill.objects.update_or_create(
                    researcher=researcher,
                    skill=skill,
                    defaults={'proficiency_level': score}
                )

        print(f"✅ AI Analizi Tamamlandi: {researcher.full_name}")

    except Exception as e:
        print(f"❌ AI Analiz Hatasi: {str(e)}")
    
    finally:
        # 🛡️ KRİTİK MÜHÜR: İşlem bitince (başarılı veya hatalı) bayrağı kapat
        if researcher:
            try:
                researcher.is_analyzing = False
                researcher.save(update_fields=['is_analyzing'])
            except Exception as final_err:
                print(f"❌ Final Flag Kapatma Hatasi: {final_err}")