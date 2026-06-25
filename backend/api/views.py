import re
import requests
from datetime import date, timedelta
from django.db.models import Sum, F
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Targets, Food, MealLog
from .serializers import TargetsSerializer, FoodSerializer, MealLogSerializer


# ── Targets ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'PUT'])
def targets(request):
    obj, _ = Targets.objects.get_or_create(pk=1)
    if request.method == 'GET':
        return Response(TargetsSerializer(obj).data)
    serializer = TargetsSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ── Foods ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def foods(request):
    if request.method == 'GET':
        qs = Food.objects.order_by('-created_at')[:100]
        return Response(FoodSerializer(qs, many=True).data)
    serializer = FoodSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def foods_search(request):
    q = request.query_params.get('q', '')
    qs = Food.objects.filter(name__icontains=q).order_by('-created_at')[:50]
    return Response(FoodSerializer(qs, many=True).data)


@api_view(['GET'])
def barcode_lookup(request, code):
    url = f'https://world.openfoodfacts.org/api/v2/product/{code}.json'
    try:
        resp = requests.get(url, headers={'User-Agent': 'GlucoTrack/1.0 (personal-tracker)'}, timeout=10)
        data = resp.json()
    except Exception as e:
        return Response({'error': str(e)}, status=502)

    if data.get('status') == 0 or not data.get('product'):
        return Response({'error': 'Product not found'}, status=404)

    p = data['product']
    n = p.get('nutriments', {})

    calories = n.get('energy-kcal_100g') or (n.get('energy_100g', 0) / 4.184)
    total_carbs = n.get('carbohydrates_100g', 0)
    fiber = n.get('fiber_100g', 0)
    net_carbs = max(0, total_carbs - fiber)
    cholesterol_raw = n.get('cholesterol_100g')
    sodium_raw = n.get('sodium_100g')

    return Response({
        'name': p.get('product_name') or p.get('product_name_en') or 'Unknown Product',
        'calories': round(calories, 1),
        'net_carbs': round(net_carbs, 1),
        'total_carbs': round(total_carbs, 1),
        'fiber': round(fiber, 1),
        'sugar': round(n.get('sugars_100g', 0), 1),
        'added_sugar': round(n.get('added-sugars_100g', 0), 1),
        'cholesterol': round((cholesterol_raw * 1000) if cholesterol_raw is not None else 0, 1),
        'sat_fat': round(n.get('saturated-fat_100g', 0), 1),
        'sodium': round((sodium_raw * 1000) if sodium_raw is not None else 0, 1),
        'protein': round(n.get('proteins_100g', 0), 1),
        'serving_size': p.get('serving_quantity') or 100,
        'serving_unit': p.get('serving_size_unit') or p.get('quantity_unit') or 'g',
        'source': 'barcode',
        'barcode_code': code,
    })


# ── Meals ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def meals(request):
    if request.method == 'GET':
        day = request.query_params.get('date', str(date.today()))
        qs = MealLog.objects.filter(logged_at__date=day).select_related('food').order_by('logged_at')
        return Response(MealLogSerializer(qs, many=True).data)

    food_id = request.data.get('food_id')
    try:
        food = Food.objects.get(pk=food_id)
    except Food.DoesNotExist:
        return Response({'error': 'Food not found'}, status=404)

    meal = MealLog.objects.create(
        food=food,
        quantity=request.data.get('quantity', 1),
        meal_type=request.data.get('meal_type', 'snack'),
        notes=request.data.get('notes'),
    )
    return Response(MealLogSerializer(meal).data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
def meal_detail(request, pk):
    try:
        meal = MealLog.objects.get(pk=pk)
    except MealLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'DELETE':
        meal.delete()
        return Response({'success': True})

    meal.quantity = request.data.get('quantity', meal.quantity)
    meal.meal_type = request.data.get('meal_type', meal.meal_type)
    meal.notes = request.data.get('notes', meal.notes)
    meal.save()
    return Response(MealLogSerializer(meal).data)


@api_view(['GET'])
def meal_history(request):
    days = int(request.query_params.get('days', 30))
    since = date.today() - timedelta(days=days)

    rows = (
        MealLog.objects
        .filter(logged_at__date__gte=since)
        .annotate(day=TruncDate('logged_at'))
        .values('day')
        .annotate(
            calories=Sum(F('food__calories') * F('quantity')),
            net_carbs=Sum(F('food__net_carbs') * F('quantity')),
            total_carbs=Sum(F('food__total_carbs') * F('quantity')),
            fiber=Sum(F('food__fiber') * F('quantity')),
            cholesterol=Sum(F('food__cholesterol') * F('quantity')),
            sat_fat=Sum(F('food__sat_fat') * F('quantity')),
            added_sugar=Sum(F('food__added_sugar') * F('quantity')),
            sodium=Sum(F('food__sodium') * F('quantity')),
            protein=Sum(F('food__protein') * F('quantity')),
        )
        .order_by('day')
    )

    return Response([{**r, 'date': str(r.pop('day'))} for r in rows])


# ── Natural language meal parsing ─────────────────────────────────────────────

WORD_NUMBERS = {
    'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'half': 0.5,
}

UNITS = [
    'tablespoons', 'tablespoon', 'tbsp', 'teaspoons', 'teaspoon', 'tsp',
    'cups', 'cup', 'ounces', 'ounce', 'oz', 'grams', 'gram', 'g',
    'pounds', 'pound', 'lb', 'lbs', 'slices', 'slice', 'pieces', 'piece',
    'servings', 'serving', 'strips', 'strip', 'cloves', 'clove',
    'handfuls', 'handful', 'cans', 'can', 'bottles', 'bottle',
    'links', 'link', 'patties', 'patty', 'fillets', 'fillet',
]

UNIT_PATTERN = re.compile(r'^(' + '|'.join(UNITS) + r')\s+(of\s+)?', re.IGNORECASE)
WORD_NUM_PATTERN = re.compile(r'^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s+', re.IGNORECASE)
NUM_PATTERN = re.compile(r'^(\d+\.?\d*|\d+/\d+)\s*')


def parse_item(raw):
    text = raw.strip().lower()
    if not text:
        return None
    quantity = 1.0
    remainder = text

    num_match = NUM_PATTERN.match(remainder)
    if num_match:
        raw_num = num_match.group(1)
        if '/' in raw_num:
            a, b = raw_num.split('/')
            quantity = float(a) / float(b)
        else:
            quantity = float(raw_num)
        remainder = remainder[num_match.end():]
    else:
        word_match = WORD_NUM_PATTERN.match(remainder)
        if word_match:
            quantity = WORD_NUMBERS.get(word_match.group(1).lower(), 1)
            remainder = remainder[word_match.end():]

    unit_match = UNIT_PATTERN.match(remainder)
    if unit_match:
        remainder = remainder[unit_match.end():]

    search_term = remainder.strip()
    if not search_term:
        return None
    return {'quantity': quantity, 'searchTerm': search_term, 'originalText': raw.strip()}


def search_off(term):
    url = (
        f'https://world.openfoodfacts.org/cgi/search.pl'
        f'?search_terms={requests.utils.quote(term)}'
        f'&search_simple=1&action=process&json=1&page_size=3'
        f'&fields=product_name,nutriments,serving_quantity,serving_size_unit,quantity_unit'
    )
    try:
        resp = requests.get(url, headers={'User-Agent': 'GlucoTrack/1.0 (personal-tracker)'}, timeout=10)
        data = resp.json()
    except Exception:
        return None

    products = data.get('products', [])
    if not products:
        return None

    p = products[0]
    n = p.get('nutriments', {})
    calories = n.get('energy-kcal_100g') or (n.get('energy_100g', 0) / 4.184)
    total_carbs = n.get('carbohydrates_100g', 0)
    fiber = n.get('fiber_100g', 0)
    net_carbs = max(0, total_carbs - fiber)
    chol_raw = n.get('cholesterol_100g')
    sod_raw = n.get('sodium_100g')

    return {
        'name': p.get('product_name') or term,
        'calories': round(calories, 1),
        'net_carbs': round(net_carbs, 1),
        'total_carbs': round(total_carbs, 1),
        'fiber': round(fiber, 1),
        'sugar': round(n.get('sugars_100g', 0), 1),
        'added_sugar': round(n.get('added-sugars_100g', 0), 1),
        'cholesterol': round((chol_raw * 1000) if chol_raw is not None else 0, 1),
        'sat_fat': round(n.get('saturated-fat_100g', 0), 1),
        'sodium': round((sod_raw * 1000) if sod_raw is not None else 0, 1),
        'protein': round(n.get('proteins_100g', 0), 1),
        'serving_size': 100,
        'serving_unit': 'g',
        'source': 'manual',
    }


@api_view(['POST'])
def parse_meal(request):
    text = request.data.get('text', '').strip()
    if not text:
        return Response({'error': 'No text provided'}, status=400)

    parts = re.split(r'\band\b|,', text, flags=re.IGNORECASE)
    parsed = [parse_item(p) for p in parts]
    parsed = [p for p in parsed if p]

    if not parsed:
        return Response({'error': 'Could not parse any food items'}, status=400)

    items = []
    for item in parsed:
        food = search_off(item['searchTerm'])
        items.append({
            'originalText': item['originalText'],
            'quantity': item['quantity'],
            'searchTerm': item['searchTerm'],
            'food': food,
            'found': food is not None,
        })

    return Response({'items': items})


# ── Health check ──────────────────────────────────────────────────────────────

@api_view(['GET'])
def health(request):
    return Response({'status': 'ok'})
