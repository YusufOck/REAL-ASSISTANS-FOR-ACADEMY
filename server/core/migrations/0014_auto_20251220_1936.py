# core/migrations/0014_auto_20251220_1936.py
from django.db import migrations

def populate_researcher_embeddings(apps, schema_editor):
    """
    Canlı veritabanındaki araştırmacıları otonom olarak akıllandırır.
    Render ücretsiz tier kısıtlamalarını aşmak için tasarlanmıştır.
    """
    # Modeli migrations üzerinden güvenli bir şekilde çekiyoruz
    Researcher = apps.get_model('core', 'Researcher')
    
    # Circular import (dairesel bağımlılık) hatasını önlemek için import burada!
    from core.services import generate_embedding
    
    researchers = Researcher.objects.filter(bio__isnull=False, embedding__isnull=True)
    
    if not researchers.exists():
        print("ℹ️ Güncellenecek yeni biyografi bulunamadı.")
        return

    for r in researchers:
        print(f"🔄 Otonom İşlem: {r.full_name} için vektör üretiliyor...")
        try:
            vector = generate_embedding(r.bio)
            if vector:
                r.embedding = vector
                r.save()
        except Exception as e:
            print(f"⚠️ {r.full_name} güncellenirken hata oluştu: {e}")

class Migration(migrations.Migration):

    dependencies = [
        # Bir önceki migration dosyanın adıyla eşleştiğinden emin ol!
        ('core', '0013_researcher_embedding'), 
    ]

    operations = [
        migrations.RunPython(populate_researcher_embeddings),
    ]