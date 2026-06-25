from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('api/', include('api.urls')),
    # SPA fallback — serve index.html for all non-API routes
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html')),
]
