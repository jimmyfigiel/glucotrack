from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # SPA fallback — must come last, excludes admin and api
    re_path(r'^(?!(api|admin|static|staticfiles)/).*$', TemplateView.as_view(template_name='index.html')),
]
