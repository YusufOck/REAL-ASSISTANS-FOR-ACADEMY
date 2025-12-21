# server/core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Researcher, Tag, EntityTag, CollaborationRequest, Notification, ProjectResearcher
import re

# ---------------------------------------------------------
# 1. MEVCUT: OTOMATİK ETİKETLEME (AUTO TAGGING)
# ---------------------------------------------------------
@receiver(post_save, sender=Researcher)
def auto_tag_researcher(sender, instance, created, **kwargs):
    if not instance.bio: return
    all_tags = Tag.objects.all()
    found_tags = []
    for tag in all_tags:
        pattern = r'\b' + re.escape(tag.name) + r'\b'
        if re.search(pattern, instance.bio, re.IGNORECASE):
            found_tags.append(tag)
    for tag in found_tags:
        EntityTag.objects.get_or_create(
            entity_type='researcher',
            entity_id=instance.researcher_id,
            tag=tag
        )

# ---------------------------------------------------------
# 2. MEVCUT: İLK BİLDİRİM SİSTEMİ (İstek Gönderildiğinde)
# ---------------------------------------------------------
@receiver(post_save, sender=CollaborationRequest)
def create_notification_on_request(sender, instance, created, **kwargs):
    if created:  
        action_text = "bir davet" if instance.request_type == 'invite' else "bir katılım isteği"
        project_title = instance.project.title if instance.project else "Proje"
        Notification.objects.create(
            recipient=instance.receiver,
            title="Yeni İşbirliği İsteği",
            message=f"{instance.sender.full_name}, '{project_title}' projesi için size {action_text} gönderdi."
        )
        print(f"🔔 TRIGGER: {instance.receiver.full_name} kişisine ilk bildirim oluşturuldu.")

# ---------------------------------------------------------
# 3. YENİ: OTONOM GRUP KATILIMI (İstek Kabul Edildiğinde) 🚀
# ---------------------------------------------------------
@receiver(post_save, sender=CollaborationRequest)
def auto_add_to_project_on_acceptance(sender, instance, created, **kwargs):
    """
    Kritik Görev: İstek 'accepted' veya 'Kabul Edildi' olduğunda,
    nereden (Admin/API) yapıldığına bakmaksızın mürettebatı projeye ekler.
    """
    # Admin panelindeki Türkçe ve İngilizce status değerlerini kapsar
    if instance.status in ['accepted', 'Kabul Edildi']:
        # Otonom Rol Belirleme
        role = "Collaborator" if instance.request_type == 'invite' else "Researcher"
        # Otonom Üye Seçimi: Davette Receiver (Ece), Katılımda Sender (Senanur)
        new_member = instance.receiver if instance.request_type == 'invite' else instance.sender
        
        # Mükerrer kaydı önleyerek takıma mühürle
        ProjectResearcher.objects.get_or_create(
            project=instance.project,
            researcher=new_member,
            defaults={'role': role, 'joined_at': timezone.now()}
        )
        print(f"✅ OTONOM SİSTEM: {new_member.full_name}, '{instance.project.title}' ekibine katıldı.")