from rest_framework import serializers
from .models import Targets, Food, MealLog


class TargetsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Targets
        fields = '__all__'


class FoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'


class MealLogSerializer(serializers.ModelSerializer):
    # Flatten food fields onto the meal for the frontend
    name = serializers.CharField(source='food.name', read_only=True)
    calories = serializers.FloatField(source='food.calories', read_only=True)
    net_carbs = serializers.FloatField(source='food.net_carbs', read_only=True)
    total_carbs = serializers.FloatField(source='food.total_carbs', read_only=True)
    fiber = serializers.FloatField(source='food.fiber', read_only=True)
    sugar = serializers.FloatField(source='food.sugar', read_only=True)
    added_sugar = serializers.FloatField(source='food.added_sugar', read_only=True)
    cholesterol = serializers.FloatField(source='food.cholesterol', read_only=True)
    sat_fat = serializers.FloatField(source='food.sat_fat', read_only=True)
    sodium = serializers.FloatField(source='food.sodium', read_only=True)
    protein = serializers.FloatField(source='food.protein', read_only=True)
    serving_size = serializers.FloatField(source='food.serving_size', read_only=True)
    serving_unit = serializers.CharField(source='food.serving_unit', read_only=True)
    source = serializers.CharField(source='food.source', read_only=True)
    food_id = serializers.IntegerField(source='food.id', read_only=True)

    class Meta:
        model = MealLog
        fields = [
            'id', 'food_id', 'quantity', 'meal_type', 'logged_at', 'notes',
            'name', 'calories', 'net_carbs', 'total_carbs', 'fiber', 'sugar',
            'added_sugar', 'cholesterol', 'sat_fat', 'sodium', 'protein',
            'serving_size', 'serving_unit', 'source',
        ]
