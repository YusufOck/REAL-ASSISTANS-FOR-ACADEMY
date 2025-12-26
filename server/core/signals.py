# server/core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Researcher, Tag, EntityTag, CollaborationRequest, Notification, ProjectResearcher
import re
from .models import ResearcherSkill
from .services import generate_embedding



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
# server/core/signals.py




@receiver(post_save, sender=CollaborationRequest)
def handle_collaboration_notification(sender, instance, created, **kwargs):
    """
    🛰️ TEK MASTER SİNYAL: 
    1. Çift bildirimleri bitirir.
    2. Modal için request_id mühürler.
    3. Reddedilme açıklamasını (response_message) otonom ekler.
    """
    
    # 🛡️ DURUM 1: YENİ İSTEK VEYA TAZELEME (Alıcıya gider)
    if created or instance.status == 'pending':
        Notification.objects.create(
            recipient=instance.receiver,
            title="YENİ İŞ BİRLİĞİ TALEBİ", 
            message=f"{instance.sender.full_name}, '{instance.project.title}' projesine katılmak için talep gönderdi.",
            request_id=instance.request_id # 👈 Dashboard modalı için kritik mühür
        )

    # 🛡️ DURUM 2: KARAR VERİLDİ (Gönderene geri gider)
    elif instance.status in ['accepted', 'rejected']:
        status_text = "kabul etti" if instance.status == 'accepted' else "reddedildi"
        title_text = "İSTEK KABUL EDİLDİ" if instance.status == 'accepted' else "İSTEK REDDEDİLDİ"
        
        # 🛰️ RED AÇIKLAMASI MÜHÜRÜ
        final_message = f"{instance.receiver.full_name}, '{instance.project.title}' projesi talebinizi {status_text}."
        if instance.status == 'rejected' and instance.response_message:
            final_message += f" Gerekçe: {instance.response_message}" # Artık reddedilen kişi bunu görebilecek!

        Notification.objects.create(
            recipient=instance.sender,
            title=title_text,
            message=final_message,
            request_id=instance.request_id
        )

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

# server/core/signals.py



@receiver(post_save, sender=ResearcherSkill)
def update_researcher_embedding_on_skill_change(sender, instance, **kwargs):
    """
    Slider (level) her değiştiğinde araştırmacının AI radarını (embedding) günceller.
    """
    researcher = instance.researcher
    
    # Tüm yetenekleri ve seviyelerini otonom olarak metne dök
    user_skills = researcher.researcher_skills.select_related('skill').all()
    skills_context = ", ".join([
        f"{s.skill.name} level {s.level}" for s in user_skills if s.level > 0
    ])

    # Yeni anlamsal metni mühürle
    semantic_text = f"{researcher.title}. {researcher.bio}. Skills: {skills_context}"
    
    # Radar (Embedding) güncellemesi
    researcher.embedding = generate_embedding(semantic_text)
    
    # Save metodu burada signals.py'daki diğer Researcher sinyallerini 
    # sonsuz döngüye sokmamalı (update_fields kullanıyoruz)
    researcher.save(update_fields=['embedding'])
    print(f"🛰️ Otonom Güncelleme: {researcher.full_name} için slider bazlı yeni vektör üretildi.")        