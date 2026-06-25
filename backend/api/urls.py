from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health),
    path('targets/', views.targets),
    path('foods/', views.foods),
    path('foods/search/', views.foods_search),
    path('foods/barcode/<str:code>/', views.barcode_lookup),
    path('meals/', views.meals),
    path('meals/history/', views.meal_history),
    path('meals/<int:pk>/', views.meal_detail),
    path('parse-meal/', views.parse_meal),
]
