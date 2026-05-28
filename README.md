# My Twin App — MYTA

> Nutrition & Sport — deux modules, une seule application.

## Stack technique

- **Framework** : Next.js 14 (App Router) + TypeScript
- **Style** : Tailwind CSS
- **Backend / Auth** : Supabase (base unique partagée)
- **IA** : Anthropic SDK (coach sport + traduction recettes)
- **Déploiement** : Vercel

## Structure du projet

```
TTA/
├── src/
│   ├── app/
│   │   ├── auth/           → Page de connexion / inscription
│   │   ├── dashboard/      → Dashboard jumeau (nutrition + sport)
│   │   ├── nutrition/
│   │   │   ├── journal/    → Journal alimentaire (issu de NutriTrack)
│   │   │   ├── calculator/ → Calcul IMC / TDEE (issu de NutriTrack)
│   │   │   ├── recipes/    → Recettes + traduction IA (issu de NutriTrack)
│   │   │   └── advice/     → Conseils nutrition (issu de NutriTrack)
│   │   ├── sport/
│   │   │   ├── session/    → Log séances (issu de FitTracker)
│   │   │   ├── tabata/     → Timer HIIT (issu de FitTracker)
│   │   │   └── history/    → Historique (issu de FitTracker)
│   │   ├── profile/        → Profil partagé (objectifs nutrition + sport)
│   │   └── api/
│   │       ├── coach/      → Coach IA sport
│   │       └── translate-recipe/ → Traduction recettes IA
│   ├── components/
│   │   ├── ui/             → Navbar, KpiCard, boutons communs
│   │   ├── nutrition/      → Composants module nutrition
│   │   ├── sport/          → Composants module sport
│   │   └── shared/         → Composants partagés
│   ├── lib/
│   │   ├── supabase/       → Client browser + server
│   │   ├── hooks/          → Custom hooks React
│   │   └── utils.ts        → Helpers (IMC, TDEE, formatages)
│   └── types/
│       └── index.ts        → Types TypeScript partagés
```

## Supabase — tables requises

### Tables Sport (FitTracker)
- `profiles` — profil utilisateur étendu
- `disciplines` — natation, musculation, cardio, boxe
- `exercises` — exercices par discipline
- `sessions` — séances enregistrées
- `session_exercises` — détail exercices par séance

### Tables Nutrition (NutriTrack)
- `journal_entries` — entrées du journal alimentaire
- `weight_log` — courbe de poids

> Note : la table `profiles` est **partagée** entre les deux modules.
> Elle inclut les objectifs nutrition ET les objectifs sport.

## Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.local.example .env.local
# → Remplir avec les clés Supabase et Anthropic

# 3. Lancer en développement
npm run dev
```

## Roadmap de migration

- [x] Structure de base + config
- [x] Auth page TTA
- [x] Dashboard jumeau
- [x] Navbar avec module switcher
- [x] Types partagés
- [x] Utils (IMC, TDEE, formatages)
- [ ] Migration module Nutrition (journal, calculateur, recettes, conseils)
- [ ] Migration module Sport (séance, tabata, historique)
- [ ] Profil partagé
- [ ] API Coach IA
- [ ] API Traduction recettes
- [ ] Tests + déploiement Vercel

---
*Projet personnel — My Twin App © 2026*
