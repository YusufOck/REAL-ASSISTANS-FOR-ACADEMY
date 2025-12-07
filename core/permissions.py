# core/permissions.py

from rest_framework import permissions

class IsAcademicianOrReadOnly(permissions.BasePermission):
    """
    Özel İzin:
    - Herkes (Giriş yapmış veya yapmamış) okuma yapabilir (GET, HEAD, OPTIONS).
    - Sadece 'academician' veya 'admin' rolüne sahip olanlar yazma yapabilir (POST, PUT, DELETE).
    """

    def has_permission(self, request, view):
        # 1. Okuma isteklerine (GET) herkese izin ver
        if request.method in permissions.SAFE_METHODS:
            return True

        # 2. Yazma isteği varsa (POST/DELETE), kullanıcının giriş yapmış olması şart
        if not request.user or not request.user.is_authenticated:
            return False

        # 3. Kullanıcının bağlı olduğu Researcher profilini bul
        # Eğer researcher profili yoksa veya rolü 'student' ise reddet.
        try:
            return request.user.researcher.role in ['academician', 'admin']
        except:
            return False  # Researcher kaydı yoksa yetki yok
        

class IsResearcherOwnerOrReadOnly(permissions.BasePermission):
    """
    Sadece profilin sahibi olan kullanıcı düzenleme yapabilir.
    Başkaları sadece okuyabilir.
    """

    def has_object_permission(self, request, view, obj):
        # 1. Okuma isteklerine (GET, HEAD, OPTIONS) herkese izin ver
        if request.method in permissions.SAFE_METHODS:
            return True

        # 2. Yazma isteği varsa:
        # Objenin (Researcher) 'user' alanı, isteği atan 'request.user' ile aynı mı?
        return obj.user == request.user