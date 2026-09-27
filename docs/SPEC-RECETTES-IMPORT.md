# MYTA — Import de recettes, liste de courses & Score MYTA

**Spec de travail — 19/08/2026**
Décisions actées : Premium à 6,99 € avec prix fondateur · v1 = photo + lien IG/TikTok + transcription audio + liste de courses · chantier lancé **après** le rebuild Android du 31/08.

---

## 0. Ce qui existe déjà (à réutiliser, pas à réécrire)

| Brique | Fichier | État |
|---|---|---|
| Génération de recettes IA par catégorie | `src/app/api/generate-recipes/` | ✅ en prod |
| Page recettes + sauvegarde + partage | `src/app/nutrition/recipes/page.tsx` | ✅ en prod |
| Table des recettes sauvegardées | `saved_recipes` | ✅ mais **incomplète** (voir ⚠️) |
| Page de partage publique | `src/app/nutrition/recipes/share/page.tsx` | ✅ |
| Base d'aliments (macros) | `src/lib/foods-db.ts` (119 Ko) | ✅ — c'est la base du score |
| Analyse nutritionnelle | `src/lib/nutrition-analysis.ts` | ✅ |
| Quotas IA par forfait | `src/lib/ai-guard.ts` | ✅ — à étendre |
| Traduction de recette | `src/app/api/translate-recipe/` | ✅ |

⚠️ **Bug à corriger en premier** : `saveRecipe()` (l. 204) persiste `calories` mais **pas** `proteines` / `glucides` / `lipides`, alors que l'interface `Recipe` les porte. Toutes les recettes déjà enregistrées sont donc inexploitables pour un score nutritionnel. Il faut ajouter les colonnes **et** prévoir un recalcul rétroactif depuis `ingredients` (qui est bien stocké en JSON).

**Ce qui manque** : l'import (photo / lien / audio), la liste de courses, la fiche imprimable, et le score.

---

## 1. Le positionnement — ce qu'on vend vraiment

Le « score nutritionnel par portion » seul ne suffit pas à te différencier : les concurrents (ReciMe, Crouton, Samsung Food, Mela) affichent tous des calories.

Le vrai écart, c'est que **MYTA a déjà le contexte de l'utilisateur** :

- La recette importée retombe dans le **journal** et compte sur les objectifs du jour (`calorie_target`, `prot/carb/fat_target` — déjà en base).
- Les forfaits **Couple / Famille** existent : la liste de courses est celle du **foyer**, pas d'une personne.
- Le **coach Waty** peut commenter la recette avec l'historique de l'utilisateur.

→ Le message n'est pas « voici le score de cette recette », c'est :
> « Cette portion = 38 % de tes calories du jour. Il te reste 47 g de protéines à couvrir ce soir. »

C'est intransposable pour un concurrent qui ne fait que de la recette.

---

## 2. Tarifs

### 2.1 Nouvelle grille

| Forfait | Aujourd'hui | Nouveau | Δ |
|---|---|---|---|
| Essentiel | 2,99 € | **2,99 €** (inchangé) | — |
| Essentiel Couple | 5,99 € | **5,99 €** (inchangé) | — |
| Essentiel Famille | 9,99 € | **9,99 €** (inchangé) | — |
| **Premium** | 4,99 € | **6,99 €** | +2,00 € |
| **Premium Couple** | 8,99 € | **11,99 €** | +3,00 € |
| **Premium Famille** | 13,99 € | **17,99 €** | +4,00 € |

Aucun incrément ne dépasse **5 €/mois**, donc aucun ne franchit le seuil Apple qui déclencherait une demande de consentement explicite — sauf en **Allemagne et Autriche**, où Apple exige le consentement pour *toute* hausse. Comme on grandfathere de toute façon, le sujet est neutralisé.

### 2.2 Répartition des features

| | Essentiel | Premium | Essai 3 j |
|---|---|---|---|
| Import de recettes | **3 / mois** (dégustation) | **30 / mois** | 5 |
| Liste de courses | ✅ illimité | ✅ illimité | ✅ |
| Score MYTA | ✅ | ✅ | ✅ |
| Fiche imprimable / partage | ✅ | ✅ | ✅ |
| Recettes IA par catégorie | ❌ (déjà le cas) | ✅ | ✅ |

Deux choix volontaires ici :

- **La liste de courses est dans tous les forfaits payants.** C'est la feature de rétention (on ouvre l'app le samedi matin), pas la feature de conversion. La verrouiller coûterait plus cher en usage qu'elle ne rapporterait en upgrade.
- **Essentiel garde 3 imports/mois.** L'import est ton meilleur hook d'acquisition — c'est ce que les gens montrent à leurs amis. Le fermer complètement tue l'effet de bouche-à-oreille. 3/mois, c'est assez pour goûter, trop peu pour s'en contenter.

### 2.3 Prix fondateur — mécanique exacte

**Stripe** — un abonnement est rattaché à un `price` immuable. Il suffit donc de :

1. Créer 3 **nouveaux** objets Price dans le Dashboard (6,99 / 11,99 / 17,99).
2. Remplacer la **valeur** des env vars `STRIPE_PRICE_PREMIUM`, `_COUPLE`, `_FAMILLE` sur Vercel par les nouveaux IDs.
3. Ne **pas** supprimer les anciens Price (les abonnements en cours pointent dessus et continuent à 4,99 €).

`getPlanIdFromPriceId()` (webhook) résout par env var → il ne reconnaîtra plus les anciens price IDs. **À corriger** : ajouter des env vars `STRIPE_PRICE_PREMIUM_LEGACY` (etc.) et les inclure dans la boucle de résolution, sinon les renouvellements des abonnés fondateurs tomberont en `plan: null`. **C'est le piège n°1 de cette bascule.**

**App Store Connect** — sur chaque abonnement `.v2`, changer le prix déclenche un écran avec l'option **« Conserver le prix actuel pour les abonnés existants »**. La cocher. Aucune resoumission de build n'est nécessaire : c'est une modification de métadonnée d'abonnement.

**RevenueCat** — rien à faire : les product IDs `fr.mytwinapp.app.premium.monthly.v2` etc. sont inchangés, seul leur prix bouge côté Apple.

### 2.4 Quand basculer

**Après** la mise en prod de la feature, jamais avant. Une hausse de prix sans contrepartie visible = churn. Une hausse annoncée avec « l'import de recettes arrive » = argument de vente, et le « tarif fondateur à 4,99 € jusqu'au X » devient une campagne d'acquisition sur les 2-3 semaines de développement.

---

## 3. Modèle de coût — pourquoi le quota est obligatoire

Estimations par import (à confirmer selon le modèle branché) :

| Type d'import | Appels | Coût unitaire |
|---|---|---|
| Photo de fiche recette | 1 vision | ~0,5 à 1,5 ct |
| Lien IG/TikTok (légende seule) | 1 texte | ~0,3 ct |
| Lien + transcription audio (60-90 s) | transcription + structuration | **~2 à 4 ct** |
| Score MYTA | 0 (calcul local depuis `foods-db.ts`) | ~0 ct |
| Fusion liste de courses | 1 texte | ~0,3 ct |

Avec la commission Apple à 15 % (Small Business Program, applicable sous 1 M$ de CA), un Premium à 6,99 € rapporte **~5,94 € net**.

- 30 imports/mois dont un tiers avec audio → **~0,60 à 1,00 €** de coût. Marge saine.
- **Sans quota**, un utilisateur qui importe 200 recettes/mois coûte 4 à 8 € → la marge disparaît sur un seul compte.

C'est ça qui rend le quota structurel, pas commercial. `ai-guard.ts` sait déjà faire ce travail — il faut juste lui ajouter un compteur **mensuel** (l'existant est journalier).

---

## 4. Score MYTA

### 4.1 Ne pas l'appeler « Nutri-Score »

Le Nutri-Score est une **marque déposée de Santé publique France**, encadrée par un règlement d'usage : déclaration obligatoire avant utilisation, charte graphique intouchable, engagement à l'appliquer à toute la gamme, transmission des données à l'OQALI. C'est conçu pour des industriels et des produits emballés.

Deuxième problème, plus fondamental : le Nutri-Score se calcule **pour 100 g, délibérément**, précisément pour empêcher qu'un fabricant améliore sa note en réduisant la portion de référence. Un « Nutri-Score par portion » serait donc à la fois juridiquement exposé et méthodologiquement contestable.

**→ Nom retenu : « Score MYTA ».** Design propre (pas de dégradé A-E vert/rouge imitant l'officiel), et une mention explicite du type « indice MYTA, sans lien avec le Nutri-Score officiel ».

### 4.2 Ce qu'on affiche

Trois niveaux, du plus objectif au plus personnel :

1. **Valeurs pour 100 g** — kcal, protéines, glucides (dont sucres), lipides (dont saturés), fibres, sel. C'est la base non contestable.
2. **Score MYTA (A → E)** — calculé pour 100 g, via l'algorithme public du Nutri-Score (points négatifs : énergie, sucres, AGS, sodium ; points positifs : fibres, protéines, part fruits/légumes/légumineuses). L'algorithme est publié, seul le nom est protégé.
3. **Impact sur ta journée** — le seul vraiment différenciant : `portion / calorie_target` et le reste à couvrir sur chaque macro. C'est ce qu'on met en gros.

### 4.3 Implémentation

`src/lib/score-myta.ts` — fonction pure, aucun appel réseau :

```
scoreRecipe(ingredients[], portions, poidsTotal?) → {
  per100g: { kcal, prot, carb, sugars, fat, satFat, fiber, salt, fvl% },
  perPortion: { ... },
  grade: 'A' | 'B' | 'C' | 'D' | 'E',
  points: number,
  confidence: 'haute' | 'moyenne' | 'faible',   // % d'ingrédients matchés dans foods-db
  unmatched: string[]
}
```

**`confidence` n'est pas cosmétique** : si 4 ingrédients sur 10 ne sont pas reconnus dans `foods-db.ts`, le score est faux. Règle : sous 70 % de masse matchée, on **n'affiche pas de note lettre** — seulement les valeurs estimées avec la mention « estimation partielle ». Afficher un « B » sur une recette à moitié devinée est le meilleur moyen de perdre la confiance de l'utilisateur.

Fallback pour les ingrédients non reconnus : un appel LLM unique qui renvoie les macros/100 g des inconnus, mis en cache dans une table `food_cache` pour ne jamais le repayer deux fois.

### 4.4 Garde-fous santé (cohérents avec ceux déjà posés)

Le `CLAUDE.md` porte une règle explicite : *l'app ne doit jamais culpabiliser*. Elle s'applique ici :

- Pas de rouge sur les recettes notées D/E. Le « cheat meal » est une catégorie assumée de l'app (elle existe déjà dans `CATEGORIES`) — on ne peut pas la proposer puis la sanctionner visuellement.
- On **situe**, on ne prescrit pas : « riche en lipides, pauvre en fibres » plutôt que « à éviter ».
- Pas de score sur les comptes `family_role: 'child'` — juste les valeurs.

---

## 5. Migration SQL

Fichier : `supabase-recipes-import.sql`. Idempotent, RLS activée, à exécuter par IDEA dans le SQL Editor.

```sql
-- ── 1. saved_recipes : macros complètes + provenance + score ──────────────
alter table saved_recipes
  add column if not exists proteines          numeric,
  add column if not exists glucides           numeric,
  add column if not exists lipides            numeric,
  add column if not exists sucres             numeric,
  add column if not exists satures            numeric,
  add column if not exists fibres             numeric,
  add column if not exists sel_g              numeric,
  add column if not exists poids_portion_g    numeric,
  add column if not exists score_grade        text,      -- 'A'..'E' ou null
  add column if not exists score_points       integer,
  add column if not exists score_confidence   text,      -- haute|moyenne|faible
  add column if not exists source_kind        text default 'ia',
                                                         -- ia|photo|instagram|tiktok|web|manuel
  add column if not exists source_url         text,
  add column if not exists source_author      text,
  add column if not exists source_captured_at timestamptz,
  add column if not exists temps_prep         integer,
  add column if not exists temps_cuisson      integer,
  add column if not exists ustensiles         jsonb;

-- ── 2. Quota mensuel d'import ─────────────────────────────────────────────
alter table profiles
  add column if not exists ai_month_key        text,     -- 'YYYY-MM'
  add column if not exists ai_month_import_used integer default 0;

-- ── 3. Cache d'aliments (macros/100 g résolues par IA, jamais repayées) ───
create table if not exists food_cache (
  key         text primary key,          -- nom normalisé, minuscules, sans accents
  kcal        numeric, prot numeric, carb numeric, sugars numeric,
  fat         numeric, sat_fat numeric, fiber numeric, salt numeric,
  fvl_pct     numeric default 0,
  source      text default 'ia',
  created_at  timestamptz default now()
);
alter table food_cache enable row level security;
create policy if not exists food_cache_read on food_cache for select using (true);
-- écriture réservée au service role (bypass RLS), pas de policy insert côté client

-- ── 4. Listes de courses ──────────────────────────────────────────────────
create table if not exists shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titre       text not null default 'Ma liste',
  recipe_ids  text[] not null default '{}',
  portions    jsonb  not null default '{}'::jsonb,  -- { recipe_id: nb_portions }
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists shopping_lists_user_idx on shopping_lists(user_id, created_at desc);

create table if not exists shopping_list_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references shopping_lists(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  rayon        text,                    -- 'Fruits & légumes', 'Boucherie', 'Épicerie'…
  nom          text not null,
  quantite     numeric,
  unite        text,
  from_recipes text[] default '{}',
  checked      boolean not null default false,
  position     integer default 0,
  created_at   timestamptz default now()
);
create index if not exists sli_list_idx on shopping_list_items(list_id, position);

alter table shopping_lists      enable row level security;
alter table shopping_list_items enable row level security;

create policy if not exists sl_own  on shopping_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists sli_own on shopping_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> ⚠️ Ne pas oublier RLS + policy sur toute nouvelle table, sinon erreurs côté client (déjà rencontré sur ce projet).

**Recalcul rétroactif** : un script one-shot qui relit `ingredients` des `saved_recipes` existantes et remplit macros + score. À lancer une fois `score-myta.ts` écrit.

---

## 6. Routes API

### `POST /api/import-recipe`

```ts
// body: { kind: 'photo' | 'link' | 'text', imageBase64?, url?, text? }
// 1. requireAuth (pattern Bearer + cookies SSR existant)
// 2. checkAiQuota(userId, 'import')            ← nouvelle feature dans ai-guard
// 3. extraction selon kind (voir §8 pour les limites juridiques)
// 4. structuration LLM → schéma Recipe
// 5. scoreRecipe() en local
// 6. retour JSON, PAS d'écriture en base (l'utilisateur valide avant de sauvegarder)
```

Le point 6 compte : on montre la fiche extraite **avant** de la sauvegarder, avec les champs éditables. L'extraction se trompera régulièrement sur les quantités — laisser corriger d'un tap évite que l'utilisateur se dise que la feature ne marche pas.

### `POST /api/shopping-list`

```ts
// body: { recipeIds: string[], portions: Record<string, number>, titre? }
// → agrège les ingrédients, normalise les unités (g/kg, ml/cl/l, cs/cc → g),
//   fusionne les doublons ("2 tomates" + "400 g tomates" → 1 ligne),
//   classe par rayon, crée la liste + ses items
```

La normalisation d'unités mérite une table de correspondance en dur dans `src/lib/units.ts` avant tout appel IA — c'est déterministe, gratuit et plus fiable qu'un LLM sur ce cas précis. L'IA n'intervient que pour le classement par rayon des ingrédients inconnus.

### `PATCH /api/shopping-list/[id]/items/[itemId]`
Cocher / décocher / modifier une quantité. Ou en direct via `supabase.from()` côté client puisque la RLS protège déjà — plus simple, moins de code.

### `ai-guard.ts` — modifications

```ts
export type AiFeature = 'meal' | 'sport' | 'recipe' | 'report' | 'import'

const MONTHLY_LIMITS: Record<string, number> = {
  essentiel: 3,    // dégustation
  premium:   30,   // fair use
}
// + branche mensuelle : ai_month_key ('YYYY-MM'), reset au changement de mois
// + essai gratuit 3 j → 5 imports (pas illimité : c'est la porte d'entrée à l'abus)
```

⚠️ Le `catch` final d'`ai-guard.ts` est en **fail-open** (`allowed: true` en cas d'erreur technique). Acceptable pour une analyse de repas à 0,3 ct, dangereux pour un import à 4 ct : prévoir un fail-**closed** spécifique sur `import`.

---

## 7. Écrans

| Route | Contenu |
|---|---|
| `/nutrition/recipes` | + onglet **« Importer »** et bouton flottant. Onglets : Catégories · Mes recettes · Importer |
| `/nutrition/recipes/import` | 3 entrées : **coller un lien** · **photo** (appareil ou galerie) · **saisir à la main**. Écran de prévisualisation éditable avant sauvegarde |
| `/nutrition/recipes/[id]` | Fiche complète : photo, temps, portions (ajustables → tout se recalcule), ingrédients, étapes, **Score MYTA**, **« % de tes objectifs du jour »**, crédit source cliquable. Actions : Ajouter au journal · Ajouter à la liste de courses · Imprimer · Partager |
| `/nutrition/recipes/[id]/print` | Feuille A4 propre, `@media print`, sans nav ni couleurs de fond, QR code vers la fiche en ligne |
| `/courses` | Liste courante groupée par rayon, cases à cocher, ajout manuel, partage du lien, archivage. Entrée dédiée dans la Navbar |

### Note iOS importante

Une vraie **extension de partage** (« Partager vers MYTA » depuis Instagram) est un composant **natif** : elle impose une modification Xcode, un nouveau build et une resoumission App Store. Avec ton compte encore en migration bloquée, c'est à exclure de la v1.

Contournement v1, sans rebuild : au retour au premier plan, l'app propose « On a détecté un lien Instagram dans ton presse-papier — l'importer ? ». Sur iOS 16+, cela déclenche la bannière système « MYTA a collé depuis Safari » — acceptable, mais prévoir aussi un simple bouton **Coller** pour ceux que ça dérange.

---

## 8. Garde-fous juridiques

### Instagram / TikTok

**Ne pas construire de téléchargeur de vidéos côté serveur.** C'est contraire aux CGU des deux plateformes, ça expose à un blocage d'IP, et c'est typiquement le genre de brique qui déclenche un rejet App Store 5.2 (propriété intellectuelle).

Voie retenue, par ordre de tentative :

1. **oEmbed / métadonnées publiques** — titre, auteur, légende. Dans la majorité des posts de recette, la recette **est** dans la légende. Ça couvre le gros du besoin pour ~0,3 ct.
2. **Capture d'écran fournie par l'utilisateur** — si la légende ne suffit pas, on demande une capture du texte à l'écran. C'est l'utilisateur qui fournit le contenu, pas nous qui l'aspirons.
3. **Transcription audio** — lot 5, à traiter à part (voir ci-dessous).

### Droit d'auteur sur les recettes

Une **liste d'ingrédients n'est pas protégeable** (c'est un fait, pas une œuvre). En revanche, **les étapes rédigées et la photo le sont**. Donc :

- On **reformule** les étapes dans le style MYTA, on ne recopie pas.
- On ne **ré-héberge jamais** la photo du créateur (on affiche une vignette via l'URL d'origine, ou une image générique).
- On **crédite systématiquement** avec un lien cliquable vers le post source (`source_author` + `source_url` sont en base pour ça).
- La page de partage publique (`/recipes/share`) doit porter le crédit, sinon on redistribue publiquement le travail d'un tiers sans attribution.

Ce n'est pas seulement défensif : le crédit visible est ce qui fait qu'un créateur voit MYTA comme un apporteur de trafic plutôt que comme un pilleur.

### Transcription audio — le lot à isoler

C'est le plus cher (~2-4 ct), le plus fragile techniquement (il faut récupérer le flux audio) et le plus exposé juridiquement. À traiter **en dernier**, une fois les lots 1-4 en prod, et à réserver au Premium avec un sous-quota (ex. 10 des 30 imports mensuels).

### CGU / mentions

À ajouter avant la mise en prod :

- Clause « contenu importé » : l'utilisateur est responsable du contenu qu'il importe, MYTA n'en revendique pas la propriété, procédure de retrait sur demande d'un créateur.
- Mention sur le Score MYTA : indice interne, sans lien avec le Nutri-Score officiel, à visée informative et non médicale.

---

## 9. Découpage en lots

| Lot | Contenu | Dépendances |
|---|---|---|
| **0** | 🚨 **Rebuild Bubblewrap + .aab en prod Play** | **avant le 31/08, bloquant** |
| **1** | `score-myta.ts` + colonnes macros + recalcul rétroactif + affichage sur les recettes existantes | migration SQL |
| **2** | Import **photo** + import **lien** (légende/oEmbed) + écran de prévisualisation éditable | lot 1 |
| **3** | **Liste de courses** : `units.ts`, agrégation, `/courses`, entrée Navbar | lot 1 |
| **4** | Fiche détaillée `[id]` + **impression** + partage crédité | lots 1-3 |
| **5** | **Transcription audio** + sous-quota | lot 2 |
| **6** | **Bascule tarifaire** Stripe + ASC + page `/pricing` + campagne « tarif fondateur » | lots 1-4 en prod |

Le lot 1 est volontairement premier : il n'a **aucune dépendance externe**, il corrige un bug existant, et il apporte de la valeur visible sur les recettes déjà enregistrées — donc même si l'import prend du retard, la mise à jour a déjà un contenu à annoncer.

---

## 10. Checklist de mise en prod

**Avant le lot 6 (bascule tarifaire)**

- [ ] Stripe : 3 nouveaux Price créés, anciens **conservés**
- [ ] Vercel : `STRIPE_PRICE_PREMIUM` / `_COUPLE` / `_FAMILLE` mis à jour
- [ ] Vercel : `STRIPE_PRICE_*_LEGACY` ajoutés **et** pris en compte dans `getPlanIdFromPriceId()` ← sinon les abonnés fondateurs perdent leur plan au renouvellement
- [ ] ASC : prix des 2 abos `.v2` modifiés avec **« conserver le prix pour les abonnés existants »** coché
- [ ] RevenueCat : rien à faire (product IDs inchangés) — vérifier quand même l'offering
- [ ] `/pricing` et landing : nouveaux tarifs + argumentaire import
- [ ] CGU : clause contenu importé + mention Score MYTA

**Avant chaque déploiement**

- [ ] `npx tsc --noEmit`
- [ ] Vérif « pas d'export interdit » dans les `page.tsx` (piège Next.js déjà rencontré) :
      `for f in $(find src/app -name "page.tsx" -o -name "layout.tsx"); do grep -Hn "^export " "$f" | grep -vE "export (default|const dynamic|const revalidate|const runtime|const metadata|const viewport|async function generateMetadata|function generateMetadata)"; done`
- [ ] Migration SQL exécutée dans Supabase **avant** le push
- [ ] Test dark mode sur les nouveaux écrans (fiche, liste de courses, impression)

---

**Sources consultées**
- [Règlement d'usage de la marque Nutri-Score — Santé publique France](https://www.santepubliquefrance.fr/content/download/150257/file/Nutriscore_reglement_usage_FR_310122_VDEF.pdf)
- [Droits d'usage de la marque Nutri-Score](https://www.nutractiv.fr/detail-blog/sante-publique-france-publie-les-droits-dusage-de-la-marque-nutri-score.html)
- [Auto-renewable subscription price increase thresholds — Apple](https://developer.apple.com/help/app-store-connect/reference/auto-renewable-subscription-price-increase-thresholds/)
