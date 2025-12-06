# core/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Researcher, Tag, EntityTag
import re

@receiver(post_save, sender=Researcher)
def auto_tag_researcher(sender, instance, created, **kwargs):
    """
    Bir araştırmacı kaydedildiğinde (insert veya update),
    biyografisini tarar ve veritabanındaki Tag'ler ile eşleşenleri otomatik atar.
    """
    if not instance.bio:
        return

    # 1. Tüm mevcut etiketleri çek (Performans için cache'lenebilir ama şimdilik düz çekelim)
    all_tags = Tag.objects.all()

    found_tags = []
    
    # 2. Regex ile kelime araması yap (Büyük/Küçük harf duyarsız)
    # \b kelime sınırı demektir. Yani 'Java' ararken 'Javascript'i bulmaz.
    for tag in all_tags:
        pattern = r'\b' + re.escape(tag.name) + r'\b'
        if re.search(pattern, instance.bio, re.IGNORECASE):
            found_tags.append(tag)

    # 3. Bulunan etiketleri EntityTag tablosuna ekle
    for tag in found_tags:
        # get_or_create: Zaten varsa tekrar ekleme
        EntityTag.objects.get_or_create(
            entity_type='researcher',
            entity_id=instance.researcher_id,
            tag=tag
        )
        print(f"✅ OTOMATİK ETİKETLENDİ: {instance.full_name} -> {tag.name}")