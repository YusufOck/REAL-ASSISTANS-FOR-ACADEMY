# core/views.py
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q, F
from django.contrib.auth.models import User
import itertools # For network relationships
from django.db.models import F
from rest_framework import viewsets, status, filters, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
import threading
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Researcher
from .serializers import ResearcherMeSerializer, ResearcherSerializer # 🛡️ Lightweight and Full Serializer
# Models and Serializers (ALL PRESERVED)
from .models import *
from .serializers import *
from .services import get_collaboration_suggestions, generate_embedding, analyze_skills_with_gemini
from .permissions import IsAcademicianOrReadOnly, IsResearcherOwnerOrReadOnly
from .serializers import (
    ProjectSerializer,
    DepartmentSerializer,  # 🛡️ THIS IS THE MISSING LINE
    NotificationSerializer,
    TagSerializer,
    EntityTagSerializer,
    SkillSerializer,
    FundingAgencySerializer,
    FundingAgencyGrantSerializer,
    ResearcherSerializer,
    ResearcherOnboardSerializer,
    PublicationSerializer,
    NetworkGraphSerializer,
    DashboardStatsSerializer,
    SendCollaborationRequestSerializer,
    RespondCollaborationRequestSerializer,
    RegisterSerializer,
    NetworkNodeSerializer,
    NetworkEdgeSerializer
)
# -------------------------
#  Simple CRUD ViewSets (Full list for URLs.py dependencies)
# -------------------------
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10  # How many users should be shown per page?
    page_size_query_param = 'page_size'
    max_page_size = 100


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by('tag_id')
    serializer_class = TagSerializer

class EntityTagViewSet(viewsets.ModelViewSet):
    queryset = EntityTag.objects.all().order_by('entity_tag_id')
    serializer_class = EntityTagSerializer

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all().order_by('skill_id')
    serializer_class = SkillSerializer

class FundingAgencyViewSet(viewsets.ModelViewSet):
    queryset = FundingAgency.objects.all().order_by('funding_agency_id')
    serializer_class = FundingAgencySerializer

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        # ORM Conversion: Autonomously fetch related projects
        projects = Project.objects.filter(funding_grants__funding_agency_id=pk).distinct().values('project_id', 'title', 'status')
        return Response(list(projects))

class FundingAgencyGrantViewSet(viewsets.ModelViewSet):
    queryset = FundingAgencyGrant.objects.all().order_by('grant_id')
    serializer_class = FundingAgencyGrantSerializer

# -------------------------
#  MAIN ENGINE: RESEARCHER VIEWSET
# -------------------------

class ResearcherViewSet(viewsets.ModelViewSet):
    queryset = Researcher.objects.all().order_by('researcher_id')
    serializer_class = ResearcherSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'onboard': return [AllowAny()]
        return super().get_permissions()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
    'department': ['exact'],
    'role': ['exact'],       # 🚀 Yeni eklenen Role Tier filtresi
    'title': ['icontains'],
    'full_name': ['icontains']
    }
    search_fields = ['full_name', 'email', 'bio']

    def _trigger_ai_analysis(self, instance, old_bio, validated_data):
        """
        🚀 ASYNCHRONOUS SEAL: Fixes the SIGKILL error at the root.
        Traps all heavy AI, Embedding, and Suggestion operations inside a background thread.
        """
        new_bio = validated_data.get('bio')
        
        # 1. Check: If the bio is the same or empty, do nothing
        if not new_bio or new_bio == old_bio:
            print(f"ℹ️ AI and Suggestions Skipped: Bio is the same. ({instance.full_name})", flush=True)
            return

        import threading

        # 🛰️ ANALYSIS STARTED: Seal the flag to trigger the spinner on the dashboard
        instance.is_analyzing = True
        instance.save(update_fields=['is_analyzing'])

        def background_ai_task(res_id, bio_text):
            """Heavy operation engine running inside the thread."""
            try:
                # 🛡️ SECURITY: Re-fetching the object inside the thread is required for DB integrity.
                from .models import Researcher, Skill, ResearcherSkill
                from .services import analyze_skills_with_gemini, generate_embedding, get_collaboration_suggestions

                res = Researcher.objects.get(pk=res_id)
                dept_name = res.department.name if res.department else "General Academic"
                
                # 🧠 Step 1: Gemini Skill Extraction (10-12 seconds)
                ai_data, raw_debug = analyze_skills_with_gemini(bio_text, dept_name)
                
                final_skills = {}
                if isinstance(ai_data, list) and len(ai_data) > 0:
                    for item in ai_data:
                        if isinstance(item, dict): final_skills.update(item)
                elif isinstance(ai_data, dict):
                    final_skills = ai_data

                res.skills = final_skills if final_skills else {"DEBUG_RAW": str(raw_debug)[:200]}
                
                # 🗄️ Autonomously update ResearcherSkill models
                ResearcherSkill.objects.filter(researcher=res).delete()
                if final_skills:
                    for s_name, s_level in final_skills.items():
                        skill_obj, _ = Skill.objects.get_or_create(name=str(s_name)[:100])
                        try:
                            level_int = int(s_level)
                        except (ValueError, TypeError):
                            level_int = 50
                        ResearcherSkill.objects.create(researcher=res, skill=skill_obj, level=level_int)

                # 🚀 Step 2: Embedding Generation (Heavy Operation)
                user_skills = ResearcherSkill.objects.filter(researcher=res).select_related('skill')
                skill_weights = ", ".join([f"{s.skill.name}:{s.level}" for s in user_skills])
                semantic_text = f"{res.title}. {bio_text}. Skills: {skill_weights}"
                res.embedding = generate_embedding(semantic_text)
                
                # 🛰️ Step 3: CALCULATE and SEAL partner suggestions
                res.suggestions_json = get_collaboration_suggestions(res.researcher_id, limit=5)
                
                # ✅ FINAL: Seal all data and turn off the spinner flag
                res.is_analyzing = False
                res.save(update_fields=['skills', 'embedding', 'suggestions_json', 'is_analyzing'])
                print(f"✅ AI Analysis Completed in Background: {res.full_name}", flush=True)

            except Exception as e:
                print(f"❌ Background AI Error: {str(e)}", flush=True)
                # Even on error, try to turn off the spinner so the UI doesn't stay locked
                try:
                    Researcher.objects.filter(pk=res_id).update(is_analyzing=False)
                except: pass

        # 🚀 FIRE AND FORGET: Start the thread; it will run in the background while returning the Response.
        analysis_thread = threading.Thread(target=background_ai_task, args=(instance.researcher_id, new_bio))
        analysis_thread.start()
        print(f"🛰️ AI Analysis Thread Started: {instance.full_name}", flush=True)

    # server/core/views.py




    def get_queryset(self):
        # 🛡️ DATA SEAL: 'prefetch_related' fills the gaps on the profile page.
        # 'select_related' fetches department data in a single JOIN.
        queryset = Researcher.objects.select_related('department').prefetch_related(
            'researcher_skills__skill'
        ).all()
        
        # 🛰️ Text-based search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(full_name__icontains=search)
            
        # 🛰️ Department filter
        dept = self.request.query_params.get('department')
        if dept:
            queryset = queryset.filter(department_id=dept)
            
        # 🔥 FLEXIBLE SKILL FILTER (C++ vs C++ Programming Solution)
        skills_raw = self.request.query_params.get('skills')
        if skills_raw:
            try:
                skill_ids = [int(s) for s in skills_raw.split(',')]
                # 1. Get the actual text equivalents (names) of the selected IDs
                selected_skill_names = Skill.objects.filter(skill_id__in=skill_ids).values_list('name', flat=True)
                
                # 2. Apply partial matching (icontains) for each name
                for name in selected_skill_names:
                    # 'researcher_skills' has been sealed (edited-image.png error fixed)
                    queryset = queryset.filter(researcher_skills__skill__name__icontains=name)
            except (ValueError, TypeError):
                pass
                
        # 🚀 Performance & Accuracy: distinct() prevents duplicate records.
        return queryset.order_by('-researcher_id').distinct()
    def get_serializer_class(self):
        # 🛰️ If listing (GET /researchers/), use the lightweight one
        if self.action == 'list':
            return ResearcherListSerializer
        return ResearcherSerializer            
        
    
    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        🚀 PERFORMANCE SEAL:
        - GET: Lightweight data package and optimized DB query (Fast).
        - PATCH: Background AI analysis and updated profile (Safe).
        """
        try:
            # 1. DB Query Optimization: Fetch all relationships at once (N+1 Fix)
            queryset = Researcher.objects.select_related('department').prefetch_related(
                'researcher_skills__skill',
                'notifications'
            )
            researcher = queryset.get(user=request.user)
            
            # 🏁 PATCH CASE: Update data and trigger AI
            if request.method == 'PATCH':
                old_bio = researcher.bio 
                serializer = ResearcherSerializer(researcher, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                
                # 🛰️ ASYNCHRONOUS TRIGGER: We unlock the UI with threading
                if 'bio' in serializer.validated_data and serializer.validated_data['bio'] != old_bio:
                    from .services import extract_skills_from_bio_task
                    thread = threading.Thread(
                        target=extract_skills_from_bio_task, 
                        args=(instance.researcher_id, instance.bio)
                    )
                    thread.start()
                
                instance.refresh_from_db()
                return Response(ResearcherSerializer(instance).data)
            
            # 🏁 GET CASE: Return only the lightweight package for dashboard speed
            # The 5s wait in edited-image.png drops to milliseconds here.
            return Response(ResearcherMeSerializer(researcher).data)
            
        except Researcher.DoesNotExist: 
            return Response({"detail": "Profile not found."}, status=404)

    def perform_update(self, serializer):
        # Protective shield for standard ModelViewSet updates
        old_bio = self.get_object().bio
        instance = serializer.save()
        self._trigger_ai_analysis(instance, old_bio, serializer.validated_data)

    @action(detail=False, methods=['post'], url_path='onboard', permission_classes=[AllowAny])
    def onboard(self, request):
        serializer = ResearcherOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        
        try:
            # 🛰️ ATOMIC SEAL: If even one operation fails, all records are rolled back
            with transaction.atomic():
                # 1. Create Django User
                user = User.objects.create_user(
                    username=d['email'], 
                    email=d['email'], 
                    password=d['password']
                )
                
                # 2. Create the Researcher profile and seal it to the User
                res = Researcher.objects.create(
                    user=user, 
                    full_name=d['full_name'], 
                    email=d['email'], 
                    department_id=d['department_id'], 
                    bio=d.get('bio', ''), 
                    role=d.get('role', 'student'),
                    title=d.get('title', '')
                )
                
                # 3. If bio exists, trigger AI analysis here as well
                if res.bio:
                    dept_name = res.department.name if res.department else "General Academic"
                    # Call AI service (Embedding + Skill Extraction)
                    # res.embedding = generate_embedding(res.bio) 
                    # res.save()

                # 4. Optional project creation logic (Same as your existing code)
                if d.get('create_project'):
                    p = d['create_project']
                    proj = Project.objects.create(
                        title=p['title'], 
                        summary=p.get('summary', ''), 
                        pi=res, 
                        department_id=d['department_id']
                    )
                    ProjectResearcher.objects.create(
                        project=proj, 
                        researcher=res, 
                        role="Principal Investigator", 
                        joined_at=timezone.now()
                    )
                
                return Response({"id": res.researcher_id, "detail": "Autonomous registration successful."}, status=201)
                
        except Exception as e:
            # In case of error, behave as if 'user' was never written to the DB
            return Response({"detail": f"Registration Error: {str(e)}"}, status=500)

    # server/core/views.py

    @action(detail=True, methods=['POST'], url_path='send-request')
    def send_request(self, request, pk=None):
        """
        🛡️ TECHNICAL SEAL: Request engine with a 3-layer security barrier.
        🚀 UPDATE: Duplicate notification bug prevented, unique message sealed.
        """
        receiver = self.get_object()
        sender = Researcher.objects.get(user=request.user)
        serializer = SendCollaborationRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            project_id = serializer.validated_data['project_id']
            message = serializer.validated_data.get('message', '')
            request_type = serializer.validated_data['request_type']

            from .models import Project, ProjectResearcher, CollaborationRequest, Notification
            from django.utils import timezone
            from datetime import timedelta

            project = Project.objects.get(pk=project_id)

            # 🛡️ BARRIER 1 & 2: Authority and membership checks
            if request_type == 'invite' and project.pi != sender:
                return Response({"detail": "Only the project lead can send an invite."}, status=403)

            if ProjectResearcher.objects.filter(project=project, researcher=receiver).exists():
                return Response({"detail": f"{receiver.full_name} is already a member of this project."}, status=400)

            # 🛰️ STEP 2: Scan for existing requests and cooldown
            existing_req = CollaborationRequest.objects.filter(sender=sender, receiver=receiver, project=project).first()

            if existing_req:
                if existing_req.status == 'pending':
                    return Response({"detail": "You already have a pending request for this project."}, status=400)
                
                if existing_req.status == 'rejected':
                    cooldown_limit = existing_req.updated_at + timedelta(days=10)
                    if timezone.now() < cooldown_limit:
                        remaining_days = (cooldown_limit - timezone.now()).days
                        return Response({"detail": f"You cannot send another request before 10 days pass. (Remaining: {remaining_days + 1} days)"}, status=403)
                
                existing_req.status = 'pending'
                existing_req.message = message
                existing_req.save()
                req_obj = existing_req
            else:
                req_obj = CollaborationRequest.objects.create(
                    sender=sender, receiver=receiver, project=project,
                    request_type=request_type, message=message
                )

            # 🔔 UNIQUE NOTIFICATION SEAL FOR RECEIVER (Bilingual Style):
            # 🛡️ Using 'update_or_create' prevents duplicate notifications for the same request.
            Notification.objects.update_or_create(
                recipient=receiver,
                request_id=req_obj.request_id,
                defaults={
                    "title": " New Collaboration Request",
                    "message": f"{sender.full_name}, '{project.title}' sent a collaboration request.",
                    "is_read": False,
                    "created_at": timezone.now()
                }
            )

            return Response({"detail": "Collaboration request successfully launched."}, status=201)
            
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['post'], url_path='respond-request')
    def respond_request(self, request):
        """
        🏁 RESPONSE AND FEEDBACK SEAL:
        🚀 UPDATE: Instead of duplicate notifications, a single unified message is sealed.
        """
        serializer = RespondCollaborationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        
        from .models import CollaborationRequest, ProjectResearcher, Notification
        from django.db import transaction
        from django.utils import timezone

        try:
            with transaction.atomic():
                # 1. Update the request
                r = CollaborationRequest.objects.select_related('sender', 'receiver', 'project').get(request_id=d['request_id'])
                r.status = d['status']
                r.response_message = d.get('response_message', '')
                r.save()

                # 2. Membership operation
                if d['status'] == 'accepted':
                    role = "Collaborator" if r.request_type == 'invite' else "Researcher"
                    new_member = r.receiver if r.request_type == 'invite' else r.sender
                    ProjectResearcher.objects.get_or_create(
                        project=r.project, researcher=new_member, 
                        defaults={'role': role, 'joined_at': timezone.now().date()}
                    )

                # 3. RESULT NOTIFICATION TO SENDER (Unified Bilingual Response):
                status_tr = "accepted" if d['status'] == 'accepted' else "rejected"
                status_en = "accepted" if d['status'] == 'accepted' else "rejected"
                
                # Update existing response or create a new one (Duplication prevention)
                Notification.objects.update_or_create(
                    recipient=r.sender,
                    request_id=r.request_id,
                    defaults={
                        "title": "Collaboration Request Responded / Request Answered",
                        "message": f"{r.receiver.full_name} has {status_tr} your request for '{r.project.title}' / {status_en} your request.",
                        "is_read": False,
                        "created_at": timezone.now()
                    }
                )

                # 4. Cleanup: Mark receiver's notification as "Read"
                Notification.objects.filter(recipient=request.user.researcher, request_id=r.request_id).update(is_read=True)

            return Response({"status": d['status']})
        except CollaborationRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)
    # server/core/views.py -> projects action inside ResearcherViewSet

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """
        🛰️ DATA STATION: Seals projects managed by or participated in by the target researcher.
        The 500 error was prevented by using the model's 'phase' field instead of 'status'.
        """
        from django.db.models import Q
        
        # Find the target researcher (pk = ID in the URL)
        researcher = self.get_object()

        # Filtering: Projects where the researcher is PI OR projects where they're a member
        # We traverse via the 'memberships__researcher' relationship
        projs = Project.objects.filter(
            Q(pi=researcher) | Q(memberships__researcher=researcher)
        ).distinct().values(
            'project_id', 
            'title', 
            'phase',        # ✅ CORRECT: Using 'status' would raise FieldError (500)
            'start_date', 
            'end_date'
        )
        
        return Response(list(projs))

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        """
        Error-free ORM Query: We fetch directly from the model.
        """
        skills = ResearcherSkill.objects.filter(researcher_id=pk).values(
            id=F('skill__skill_id'), 
            name=F('skill__name'), 
            level=F('level')
        )
        return Response(list(skills))

# -------------------------
#  PROJECT AND PUBLICATION VIEWSETS
# -------------------------

# Seal ProjectViewSet in core/views.py like this:

import threading
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Project, Researcher, ProjectResearcher, FundingAgencyGrant
from .serializers import ProjectSerializer, FundingAgencyGrantSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {'department': ['exact'], 'phase': ['exact']}
    search_fields = ['title', 'summary', 'requirements']

    def get_queryset(self):
        """
        🛡️ SECURITY LOCK: Only projects the user is involved in or leads.
        """
        try:
            # 1. Fetch the currently logged-in researcher
            researcher = Researcher.objects.get(user=self.request.user)
            
            # 🚀 CRITICAL FIX: There is no 'researcher_skills' field in the Project model.
            # Based on the clue in the logs, we filter through 'memberships'.
            return Project.objects.filter(
                Q(pi=researcher) | Q(memberships__researcher=researcher) 
            ).distinct().order_by('-created_at')
            
        except Researcher.DoesNotExist:
            # If the profile can't be found, return an empty list to prevent a 500 error
            return Project.objects.none()

    def perform_create(self, serializer):
        """
        🚀 PERFORMANCE SEAL:
        The project is created immediately; AI analysis runs quietly in the background.
        """
        try:
            # 1. PI Assignment: Seal the creator as the Principal Investigator
            researcher = Researcher.objects.get(user=self.request.user)
            instance = serializer.save(pi=researcher)
            
            # 2. ASYNCHRONOUS AI TRIGGER:
            # Prevents the 30-second freeze (SIGKILL) seen in the logs.
            from .services import generate_embedding
            
            def run_project_ai_task(project_id, text_to_embed):
                try:
                    vector = generate_embedding(text_to_embed)
                    if vector:
                        # We break the infinite loop by using update_fields
                        Project.objects.filter(pk=project_id).update(embedding=vector)
                        print(f"✅ AI SEAL: Vector generated for '{instance.title}'.")
                except Exception as e:
                    print(f"❌ Background AI Error: {e}")

            combined_text = f"{instance.title}. {instance.summary or ''}. Needs: {instance.requirements or ''}"
            
            # Start the thread (Fire and Forget)
            task_thread = threading.Thread(
                target=run_project_ai_task, 
                args=(instance.project_id, combined_text)
            )
            task_thread.start()

        except Researcher.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "Researcher profile not found."})

    @action(detail=True, methods=['get'])
    def suggestions(self, request, pk=None):
        """
        🧠 AI MATCHING ENGINE:
        Performs hybrid scoring while excluding the current user (the requester).
        🚀 SEAL: Full parameter alignment with services.py ensured.
        """
        from .services import get_project_specific_suggestions
        
        try:
            # 🛰️ 1. Identify the currently logged-in researcher
            current_res = Researcher.objects.get(user=request.user)
            
            # 🚀 2. Send both the project ID and the excluded user ID to the suggestion engine
            # With the 'exclude_id' parameter, we remove our own profile from the list.
            suggestions = get_project_specific_suggestions(
                project_id=pk, 
                exclude_id=current_res.researcher_id, 
                limit=5
            )
            
            return Response(suggestions)
            
        except Researcher.DoesNotExist:
            return Response({"detail": "Researcher profile not found."}, status=404)
        except Exception as e:
            # 🛡️ FIX: Return a detailed message in case of a 500 error to help debugging
            return Response({"detail": f"Suggestion engine error: {str(e)}"}, status=500)

    @action(detail=True, methods=['get'])
    def researchers(self, request, pk=None):
        """Lists the project crew."""
        ms = ProjectResearcher.objects.filter(project_id=pk).select_related('researcher')
        return Response([
            {
                "researcher_id": m.researcher.researcher_id, 
                "full_name": m.researcher.full_name, 
                "role": m.role
            } for m in ms
        ])

    # server/core/views.py -> inside ProjectViewSet

    @researchers.mapping.post
    def add_researcher(self, request, pk=None):
        """🛡️ AUTHORIZATION SEAL: Only the project manager can add a member."""
        project = self.get_object()
        current_researcher = Researcher.objects.get(user=request.user)

        # 🚫 Security Check
        if project.pi != current_researcher:
            return Response(
                {"detail": "You are not authorized for this action. Only the project lead can add members."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        d = request.data
        ProjectResearcher.objects.get_or_create(
            project_id=pk, 
            researcher_id=d['researcher_id'], 
            defaults={'role': d.get('role', 'Researcher'), 'joined_at': timezone.now()}
        )
        return Response({"detail": "Crew member added"}, status=201)

    @action(detail=True, methods=['get'])
    def funding(self, request, pk=None):
        """Returns funding support information."""
        grants = FundingAgencyGrant.objects.filter(project_id=pk).select_related('funding_agency')
        return Response(FundingAgencyGrantSerializer(grants, many=True).data)
    


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all().order_by('publication_id')
    serializer_class = PublicationSerializer

    @action(detail=True, methods=['get'])
    def authors(self, request, pk=None):
        # ORM CONVERSION
        auths = AuthorPublication.objects.filter(publication_id=pk).select_related('researcher').order_by('author_order')
        return Response([{"researcher_id": a.researcher.researcher_id, "full_name": a.researcher.full_name, "order": a.author_order} for a in auths])

# -------------------------
#  NETWORK AND DASHBOARD
# -------------------------

class NetworkViewSet(viewsets.ViewSet):
    @extend_schema(responses={200: NetworkGraphSerializer})
    def list(self, request):
        nodes = [{"id": r.researcher_id, "label": r.full_name, "group": r.department.name if r.department else "N/A"} for r in Researcher.objects.select_related('department').all()]
        return Response({"nodes": nodes, "edges": []})

class DashboardViewSet(viewsets.ViewSet):
    @extend_schema(responses={200: DashboardStatsSerializer})
    @action(detail=False, methods=["get"], url_path="general-stats")
    def general_stats(self, request):
        return Response({"total_researchers": Researcher.objects.count(), "total_projects": Project.objects.count(), "total_publications": Publication.objects.count()})

    @action(detail=False, methods=["get"], url_path="department-distribution")
    def department_distribution(self, request):
        qs = Department.objects.annotate(researcher_count=Count("researchers")).values("name", "researcher_count").order_by("-researcher_count")
        return Response([{"department": r["name"], "researcher_count": r["researcher_count"]} for r in qs])

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# core/views.py (Add at the bottom)

class NotificationViewSet(viewsets.ModelViewSet):
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 🛡️ SECURITY SEAL: Show/delete only notifications of the logged-in researcher
        try:
            res = Researcher.objects.get(user=self.request.user)
            return Notification.objects.filter(recipient=res)
        except Researcher.DoesNotExist:
            return Notification.objects.none()
