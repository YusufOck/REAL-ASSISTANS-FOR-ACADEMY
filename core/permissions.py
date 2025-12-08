from rest_framework import permissions

class IsResearcherOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    But ADMINS (is_staff) can do anything.
    """
    def has_object_permission(self, request, view, obj):
        # 1. Okuma işlemleri (GET, HEAD, OPTIONS) herkese serbest
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 2. Eğer kullanıcı ADMIN ise (is_staff), her şeye izin ver
        if request.user and request.user.is_staff:
            return True

        # 3. Değilse, sadece profilin SAHİBİ ise izin ver
        # (Researcher modelinde 'user' alanı varsa)
        return hasattr(obj, 'user') and obj.user == request.user

class IsAcademicianOrReadOnly(permissions.BasePermission):
    """
    Sadece Akademisyenler (veya Adminler) proje ekleyebilir/silebilir.
    """
    def has_permission(self, request, view):
        # Okuma herkese serbest
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Adminlere torpil geç
        if request.user and request.user.is_staff:
            return True

        # Kullanıcı giriş yapmış mı ve Researcher profili var mı?
        if not request.user.is_authenticated:
            return False
            
        try:
            # Kullanıcının Researcher profilini bul
            researcher = request.user.researcher 
            return researcher.role == 'academician'
        except:
            return False