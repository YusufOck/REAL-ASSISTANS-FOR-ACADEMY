# server/core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Researcher, Tag, EntityTag, CollaborationRequest, Notification, ProjectResearcher
import re
from .models import ResearcherSkill
from .services import generate_embedding



# ---------------------------------------------------------
# 1. EXISTING: AUTOMATIC TAGGING (AUTO TAGGING)
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
# 2. EXISTING: INITIAL NOTIFICATION SYSTEM (When Request Is Sent)
# ---------------------------------------------------------
# server/core/signals.py




@receiver(post_save, sender=CollaborationRequest)
def handle_collaboration_notification(sender, instance, created, **kwargs):
    """
    🛰️ SINGLE MASTER SIGNAL:
    1. Eliminates duplicate notifications.
    2. Seals request_id for the modal.
    3. Autonomously appends the rejection explanation (response_message).
    """
    
    # 🛡️ CASE 1: NEW REQUEST OR REFRESH (Sent to receiver)
    if created or instance.status == 'pending':
        Notification.objects.create(
            recipient=instance.receiver,
            title="NEW COLLABORATION REQUEST", 
            message=f"{instance.sender.full_name} sent a request to join the '{instance.project.title}' project.",
            request_id=instance.request_id # 👈 Critical seal for dashboard modal
        )

    # 🛡️ CASE 2: DECISION MADE (Sent back to sender)
    elif instance.status in ['accepted', 'rejected']:
        status_text = "accepted" if instance.status == 'accepted' else "rejected"
        title_text = "REQUEST ACCEPTED" if instance.status == 'accepted' else "REQUEST REJECTED"
        
        # 🛰️ REJECTION EXPLANATION SEAL
        final_message = f"{instance.receiver.full_name} has {status_text} your request for the '{instance.project.title}' project."
        if instance.status == 'rejected' and instance.response_message:
            final_message += f" Reason: {instance.response_message}" # The rejected user can now see this!

        Notification.objects.create(
            recipient=instance.sender,
            title=title_text,
            message=final_message,
            request_id=instance.request_id
        )

# ---------------------------------------------------------
# 3. NEW: AUTONOMOUS GROUP JOIN (When Request Is Accepted) 🚀
# ---------------------------------------------------------
@receiver(post_save, sender=CollaborationRequest)
def auto_add_to_project_on_acceptance(sender, instance, created, **kwargs):
    """
    Critical Task: When the request is 'accepted' or 'Accepted',
    adds the crew to the project regardless of where (Admin/API) it was triggered.
    """
    # Covers Turkish and English status values in the admin panel
    if instance.status in ['accepted', 'Accepted']:
        # Autonomous Role Determination
        role = "Collaborator" if instance.request_type == 'invite' else "Researcher"
        # Autonomous Member Selection: Receiver (Ece) for invites, Sender (Senanur) for joins
        new_member = instance.receiver if instance.request_type == 'invite' else instance.sender
        
        # Seal into the team while preventing duplicate records
        ProjectResearcher.objects.get_or_create(
            project=instance.project,
            researcher=new_member,
            defaults={'role': role, 'joined_at': timezone.now()}
        )
        print(f"✅ AUTONOMOUS SYSTEM: {new_member.full_name} joined the '{instance.project.title}' team.")

# server/core/signals.py



@receiver(post_save, sender=ResearcherSkill)
def update_researcher_embedding_on_skill_change(sender, instance, **kwargs):
    """
    Updates the researcher's AI radar (embedding) every time the slider (level) changes.
    """
    researcher = instance.researcher
    
    # Autonomously convert all skills and levels into text
    user_skills = researcher.researcher_skills.select_related('skill').all()
    skills_context = ", ".join([
        f"{s.skill.name} level {s.level}" for s in user_skills if s.level > 0
    ])

    # Seal the new semantic text
    semantic_text = f"{researcher.title}. {researcher.bio}. Skills: {skills_context}"
    
    # Radar (Embedding) update
    researcher.embedding = generate_embedding(semantic_text)
    
    # The save method here should not trigger other Researcher signals
    # into an infinite loop (we use update_fields)
    researcher.save(update_fields=['embedding'])
    print(f"🛰️ Autonomous Update: A new slider-based vector was generated for {researcher.full_name}.")
