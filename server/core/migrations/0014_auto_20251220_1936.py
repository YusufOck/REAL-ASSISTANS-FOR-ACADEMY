from django.db import migrations

def force_populate_embeddings(apps, schema_editor):
    Researcher = apps.get_model('core', 'Researcher')
    from core.services import generate_embedding
    
    # Sadece NULL olanları değil, biyografisi olan HERKESİ güncelle
    researchers = Researcher.objects.filter(bio__isnull=False)
    
    for r in researchers:
        print(f"🔄 CANLI SİSTEM GÜNCELLENİYOR: {r.full_name}")
        try:
            vector = generate_embedding(r.bio)
            if vector:
                r.embedding = vector
                r.save()
        except Exception as e:
            print(f"⚠️ {r.full_name} için hata: {e}")

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0013_researcher_embedding'),
    ]
    operations = [
        migrations.RunPython(force_populate_embeddings),
    ]