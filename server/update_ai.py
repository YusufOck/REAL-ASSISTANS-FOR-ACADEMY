import time
from core.models import Researcher
from core.services import generate_embedding
from django.db import connection

def run_update():
    # 1. Tüm kullanıcıları getir
    all_researchers = Researcher.objects.all()
    print(f"🚀 {len(all_researchers)} kullanıcı için Gemini dönüşümü başlıyor...")

    count = 0
    for r in all_researchers:
        # Boş kullanıcıları atla
        if not r.full_name:
            continue

        # 2. Metni hazırla (Title + Bio)
        text = f"{r.title or ''} {r.bio or ''}"
        
        # Eğer metin çok kısaysa isminden üret
        if len(text) < 5:
            text = f"Researcher named {r.full_name} working in academic field."

        print(f"🤖 İşleniyor: {r.full_name}...", end="")

        try:
            # 3. Gemini'ye gönder (768 boyutlu vektör al)
            vector = generate_embedding(text)
            
            # Eğer vektör boş geldiyse atla
            if not vector or len(vector) != 768:
                print(" ❌ HATA: Vektör alınamadı veya boyutu yanlış.")
                continue

            # 4. Veritabanına kaydet (SQL ile)
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE researcher SET embedding = %s WHERE researcher_id = %s",
                    [vector, r.researcher_id]
                )
            
            print(" ✅ OK!")
            count += 1
            
            # 5. API Kotasına takılmamak için bekle
            time.sleep(1.5)

        except Exception as e:
            print(f" ⚠️ HATA: {e}")

    print(f"\n🎉 İşlem Tamamlandı! Toplam {count} kullanıcı güncellendi.")

# Fonksiyonu çalıştır
run_update()