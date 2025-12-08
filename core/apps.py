from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

# --- BU METODU EKLEMEN ŞART ---
    def ready(self):
        import core.signals
    # ------------------------------