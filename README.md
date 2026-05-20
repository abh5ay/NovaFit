# novaFit — Full Stack AI Fitness App

> AI-powered workout planner, meal planner, food calorie scanner & body fat analyzer

## 🤖 AI Stack (4-Provider Fallback)

The app automatically tries providers in order — whichever responds first wins:

```
Groq (fastest) → NVIDIA NIM → OpenRouter → Hugging Face
```

If all fail, cached results from Supabase are served.

---

## 📁 Project Structure

```
novaFit/
├── mobile/          ← React Native (Expo) app
│   ├── app/         ← Expo Router screens
│   │   ├── (auth)/  ← login, signup, onboarding (4 steps)
│   │   └── (tabs)/  ← home, workout, diet, camera, profile
│   ├── components/  ← CalorieRing, MacroBar, FoodCard, WorkoutCard
│   └── lib/         ← supabase.ts, calc.ts, api.ts
│
├── backend/         ← Node.js + Express
│   ├── server.js
│   ├── routes/
│   │   ├── aiRouter.js   ← 4-provider fallback engine
│   │   ├── ai.js         ← /workout, /meal-plan
│   │   ├── food.js       ← /scan-food, /nutrition
│   │   └── bodyfat.js    ← /analyze-body
│   └── middleware/
│       └── safety.js     ← calorie floors, workout limits
│
└── supabase/
    └── schema.sql    ← All 6 tables + RLS policies
```

---

## 🔑 Free API Keys Required

| Service | URL | Key |
|---|---|---|
| Groq | [console.groq.com](https://console.groq.com) | `GROQ_API_KEY` |
| NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com) | `NVIDIA_API_KEY` |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | `OPENROUTER_API_KEY` |
| Hugging Face | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `HF_TOKEN` |
| USDA Food DB | [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup) | `USDA_KEY` |
| Supabase | [supabase.com](https://supabase.com) | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` |

---

## 🚀 Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in your API keys
npm install
npm run dev            # runs on :3000
```

### 2. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste `supabase/schema.sql` → Run

### 3. Mobile App

```bash
cd mobile
cp .env.example .env   # fill in Supabase + backend URL
npm install
npx expo start         # scan QR with Expo Go app
```

### 4. Deploy Backend to Render

1. Push to GitHub
2. [render.com](https://render.com) → New Web Service → connect repo → `/backend`
3. Build: `npm install` | Start: `node server.js`
4. Add all env vars in Render dashboard

---

## 🛡️ Safety Rules (Server-Side Enforced)

- Min calories: 1,200 (female) / 1,500 (male)
- Max deficit: 750 kcal/day
- Workout days: 2–6/week
- Session length: 20–90 minutes

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User stats, goal, activity, target physique |
| `food_logs` | Daily food entries with macros |
| `workout_logs` | Exercise completion tracking |
| `meal_plans` | AI-generated meal plans (cached JSON) |
| `workout_plans` | AI-generated workout plans (cached JSON) |
| `body_scans` | BF% scan history |
