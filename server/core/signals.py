from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Researcher, Tag, EntityTag, CollaborationRequest, Notification
import re

# ---------------------------------------------------------
# 1. MEVCUT SİNYAL: OTOMATİK ETİKETLEME (AUTO TAGGING)
# ---------------------------------------------------------
@receiver(post_save, sender=Researcher)
def auto_tag_researcher(sender, instance, created, **kwargs):
    """
    Bir araştırmacı kaydedildiğinde (insert veya update),
    biyografisini tarar ve veritabanındaki Tag'ler ile eşleşenleri otomatik atar.
    """
    if not instance.bio:
        return

    # 1. Tüm mevcut etiketleri çek
    all_tags = Tag.objects.all()
    found_tags = []
    
    # 2. Regex ile kelime araması yap
    for tag in all_tags:
        # \b kelime sınırı demektir. 'Java' ararken 'Javascript'i bulmaz.
        pattern = r'\b' + re.escape(tag.name) + r'\b'
        if re.search(pattern, instance.bio, re.IGNORECASE):
            found_tags.append(tag)

    # 3. Bulunan etiketleri EntityTag tablosuna ekle
    for tag in found_tags:
        entity_tag, created_tag = EntityTag.objects.get_or_create(
            entity_type='researcher',
            entity_id=instance.researcher_id,
            tag=tag
        )
        
        if created_tag:
            print(f"✅ OTOMATİK ETİKETLENDİ: {instance.full_name} -> {tag.name}")
        else:
            pass # Zaten vardı

# ---------------------------------------------------------
# 2. YENİ SİNYAL: BİLDİRİM SİSTEMİ (NOTIFICATION TRIGGER)
# ---------------------------------------------------------
@receiver(post_save, sender=CollaborationRequest)
def create_notification_on_request(sender, instance, created, **kwargs):
    """
    Trigger: CollaborationRequest tablosuna yeni bir satır eklendiğinde çalışır.
    Action: Alıcıya (Receiver) otomatik bildirim oluşturur.
    """
    # Sadece YENİ kayıt oluştuğunda (Update işleminde değil)
    if created:  
        
        # Mesaj tipini belirle
        if instance.request_type == 'invite':
            action_text = "bir davet"
        else:
            action_text = "bir katılım isteği"
            
        sender_name = instance.sender.full_name
        
        # Proje nesnesine erişim (Foreign Key olduğu için instance.project diyebiliriz)
        project_title = instance.project.title if instance.project else "Proje"
        
        # Bildirimi Oluştur
        Notification.objects.create(
            recipient=instance.receiver,
            title="Yeni İşbirliği İsteği",
            message=f"{sender_name}, '{project_title}' projesi için size {action_text} gönderdi."
        )
        
        print(f"🔔 TRIGGER ÇALIŞTI: {instance.receiver.full_name} kişisine bildirim oluşturuldu.")