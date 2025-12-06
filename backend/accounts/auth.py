from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session authentication that skips CSRF enforcement for API use."""
    def enforce_csrf(self, request):
        return None
