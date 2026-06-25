from django.db import models
from django.contrib.auth.models import User


class Targets(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='targets')
    net_carbs_per_meal = models.FloatField(default=30)
    net_carbs_per_day = models.FloatField(default=100)
    cholesterol_per_day = models.FloatField(default=200)
    sat_fat_per_day = models.FloatField(default=20)
    added_sugar_per_day = models.FloatField(default=25)
    fiber_per_day = models.FloatField(default=25)
    sodium_per_day = models.FloatField(default=2300)
    photo_scan_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'targets'


class Food(models.Model):
    SOURCE_CHOICES = [('barcode', 'Barcode'), ('manual', 'Manual')]

    name = models.CharField(max_length=255)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    barcode_code = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    calories = models.FloatField(default=0)
    net_carbs = models.FloatField(default=0)
    total_carbs = models.FloatField(default=0)
    fiber = models.FloatField(default=0)
    sugar = models.FloatField(default=0)
    added_sugar = models.FloatField(default=0)
    cholesterol = models.FloatField(default=0)
    sat_fat = models.FloatField(default=0)
    sodium = models.FloatField(default=0)
    protein = models.FloatField(default=0)
    serving_size = models.FloatField(default=1)
    serving_unit = models.CharField(max_length=50, default='serving')
    created_at = models.DateTimeField(auto_now_add=True)


class MealLog(models.Model):
    MEAL_CHOICES = [
        ('breakfast', 'Breakfast'), ('lunch', 'Lunch'),
        ('dinner', 'Dinner'), ('snack', 'Snack'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meal_logs')
    food = models.ForeignKey(Food, on_delete=models.CASCADE, related_name='meal_logs')
    quantity = models.FloatField(default=1)
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES, default='snack')
    logged_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
