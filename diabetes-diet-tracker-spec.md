# GlucoTrack — Low-Carb / Low-Cholesterol Diet Tracker
### App Specification for Claude Code

---

## 1. Purpose

A personal mobile-friendly web app to help one user manage a **low-carbohydrate, low-cholesterol diet for Type 2 Diabetes**. The app lets the user scan or photograph food, retrieves/estimates its nutrition info, and tells them how that food fits into their daily diet targets.

**This app is a tracking tool, not a medical device.** It does not diagnose, treat, or replace advice from a doctor or dietitian. All nutrition targets are user-editable defaults, not prescriptions.

---

## 2. Platform & Tech Stack

- **Type:** Mobile-friendly Progressive Web App (PWA) — installable on phone home screen, no app store needed. (Switch to React Native later if a true native app is wanted.)
- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express (lightweight local server)
- **Database:** SQLite (single-user, file-based, no setup needed)
- **Barcode lookup:** [Open Food Facts API](https://world.openfoodfacts.org/) (free, no key required)
- **Photo-based food recognition:** Anthropic Claude API (vision) — sends meal photo, returns identified foods + estimated portions + estimated macros
- **Barcode scanning (camera):** `html5-qrcode` or `react-qr-barcode-scanner` library (uses phone camera, no extra hardware)

---

## 3. Core Concept: Daily Targets

The user sets daily/per-meal targets in **Settings**. Defaults are pre-filled with commonly cited low-carb/low-cholesterol T2D guidance, clearly marked as **defaults to be reviewed with a doctor/dietitian**, fully editable:

| Target | Default | Editable |
|---|---|---|
| Net carbs per meal | 30g | ✅ |
| Net carbs per day | 100g | ✅ |
| Dietary cholesterol per day | 200mg | ✅ |
| Saturated fat per day | 20g | ✅ |
| Added sugar per day | 25g | ✅ |
| Fiber per day (goal, not limit) | 25g | ✅ |
| Sodium per day (optional toggle) | 2300mg | ✅ |

App displays a one-time disclaimer on first launch and a permanent "Edit my targets" reminder in Settings: *"These are general starting points, not medical advice. Please confirm your personal targets with your doctor or a registered dietitian."*

---

## 4. Key Features

### 4.1 Food Logging — Input Methods
1. **Barcode scan** — opens camera, scans barcode, queries Open Food Facts, returns full nutrition label.
2. **Photo scan** *(togglable — see 4.1.1)* — opens camera, takes photo of meal/plate, sends to Claude API vision, returns:
   - List of identified food items
   - Estimated portion sizes
   - Estimated carbs, cholesterol, sat fat, sugar, fiber, sodium, calories per item
   - **Confidence flag**: app clearly labels this as an *estimate*, with an "edit before saving" step so the user can correct portion sizes or swap a misidentified food.
3. **Manual search/entry** — fallback text search (Open Food Facts text search) or fully manual macro entry for homemade meals.

#### 4.1.1 Photo Scan Toggle
- Setting: **Settings → "Enable photo scan"** (on/off switch, default **on**).
- When **off**:
  - The "Photo scan" option is hidden from the Scan screen — only barcode + manual entry are shown.
  - No images are sent to the Claude API, and no API calls are made for vision/estimation.
  - Any previously saved photo-estimated meals remain visible in History (data isn't deleted by toggling the setting).
- When **on**: behaves as described in 4.1, item 2.
- Rationale for the toggle: lets the user avoid AI photo costs/calls entirely, or skip needing a Claude API key configured, while still using barcode + manual logging.

### 4.2 Meal Fit Evaluation
After any food is logged (any of the 3 methods), before saving, show a **"How this fits your plan"** card:
- Green / Yellow / Red indicator per nutrient (carbs, cholesterol, sat fat, sugar) vs. that meal's share of daily target
- Running daily total vs. daily target, e.g. "62g / 100g net carbs today"
- Plain-language note, e.g. "This meal is within your carb target but high in cholesterol for one sitting — you'll have ~50mg left for the rest of the day."
- User can edit quantities/items here and the fit recalculates live.

### 4.3 Daily Dashboard
- Today's totals vs. targets (carbs, cholesterol, sat fat, sugar, fiber, sodium) as progress bars
- Meals logged today, tap to view/edit/delete
- Quick "+" button always visible for fast logging (low friction)

### 4.4 History & Trends
- Calendar view — tap any past day to see that day's meals and totals
- Trend charts (carbs/day, cholesterol/day over last 7/30/90 days)
- Highlight streaks of days within target

### 4.5 Food Library
- Auto-saved list of previously logged foods/meals for quick re-logging ("log again")
- Mark favorites/common meals for one-tap logging

### 4.6 Settings
- Edit all daily/per-meal targets
- **Enable/disable photo scan** (on/off toggle, default on — see 4.1.1)
- Edit personal info (optional: weight, for future trend correlation — no medical claims made on this data)
- Export data (CSV) for sharing with doctor/dietitian
- Clear disclaimer text, editable target ranges with tooltips citing that these should come from a healthcare provider

---

## 5. Data Model (SQLite)

```
users
- id, created_at

targets
- id, user_id, net_carbs_per_meal, net_carbs_per_day,
  cholesterol_per_day, sat_fat_per_day, added_sugar_per_day,
  fiber_per_day, sodium_per_day, photo_scan_enabled (bool, default true), updated_at

foods
- id, name, source ("barcode" | "photo" | "manual"),
  barcode_code (nullable), calories, net_carbs, total_carbs, fiber,
  sugar, added_sugar, cholesterol, sat_fat, sodium, protein,
  serving_size, serving_unit, created_at

meal_logs
- id, user_id, food_id, quantity, meal_type ("breakfast"|"lunch"|"dinner"|"snack"),
  logged_at, notes

photo_estimates (audit trail for AI-estimated meals)
- id, meal_log_id, raw_image_path, claude_response_json, user_edited (bool)
```

---

## 6. Screens

1. **Home / Dashboard** — today's progress bars + log button + recent meals
2. **Scan** — choose barcode / photo / manual → capture → results
3. **Meal Fit Review** — editable nutrition card with fit evaluation, "Save" / "Edit" / "Discard"
4. **History** — calendar + trend charts
5. **Food Library** — saved/favorite foods, search, re-log
6. **Settings** — targets editor, disclaimer, data export

---

## 7. API Integration Notes (for Claude Code)

**Open Food Facts (barcode):**
```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
```
Free, no auth. Returns full nutrient breakdown per 100g and per serving when available.

**Claude API (photo estimation):**
- Send image as base64 with a prompt instructing Claude to return **strict JSON only**: list of food items, estimated grams, and estimated macros (carbs, fiber, sugar, cholesterol, sat fat, sodium, protein, calories) per item.
- Always render results as **editable fields**, never silently trusted — estimates should be visually distinguished (e.g. "estimated" badge) from barcode-sourced exact data.

---

## 8. Explicit Non-Goals (v1)

- No medication tracking or insulin dosing calculations
- No blood glucose meter integration (could be a future version)
- No multi-user accounts/sharing (single user only)
- No medical advice, diagnosis, or automated "you should eat X" meal planning — the app evaluates fit against the user's own targets only

---

## 9. Disclaimer Text (use verbatim in-app)

> This app is a personal tracking tool and does not provide medical advice. Default nutrition targets are general starting points and may not be appropriate for you. Please set your targets in consultation with your doctor or a registered dietitian, and consult them before making changes to your diet.
