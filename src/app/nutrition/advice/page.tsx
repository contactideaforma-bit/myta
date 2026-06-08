'use client'

import { useState } from 'react'
import { X, Clock, ChevronRight, ChevronDown } from 'lucide-react'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'

interface Step { title: string; content: string }
interface Conseil {
  id: number; emoji: string; cat: 'nutrition' | 'sport' | 'mindset'
  readMin: number; title: string; summary: string
  steps: Step[]
  tips?: string[]
  avoid?: string[]
  numbers?: { val: string; lbl: string; color: string }[]
}

const CONSEILS: Conseil[] = [
  {
    id: 1, emoji: '🥗', cat: 'nutrition', readMin: 6,
    title: 'Les bases du rééquilibrage alimentaire',
    summary: 'Pas de régime, pas de privation. Le rééquilibrage alimentaire c\'est apprendre à bien manger durablement, sans frustration ni calcul obsessionnel.',
    steps: [
      { title: '1. Comprendre la différence régime / rééquilibrage', content: 'Un régime restrictif fonctionne sur le court terme mais génère effet yoyo, frustration et troubles du comportement alimentaire. Le rééquilibrage lui ne supprime aucun aliment — il réapprend à les doser correctement. On mange de tout, en quantités adaptées à ses besoins réels.' },
      { title: '2. La règle de l\'assiette équilibrée', content: 'Chaque repas doit contenir : ½ assiette de légumes (crus ou cuits), ¼ de protéines (viande, poisson, œuf, légumineuses), ¼ de féculents complets (riz brun, pâtes complètes, quinoa, pain complet). Pas besoin de peser — visualise juste ces proportions.' },
      { title: '3. Les 5 piliers fondamentaux', content: 'Variété : aucun aliment n\'est interdit, tout est question de fréquence. Régularité : 3 vrais repas par jour stabilisent la glycémie. Satiété : mange lentement, pose ta fourchette entre chaque bouchée. Hydratation : 1,5L d\'eau minimum par jour. Plaisir : intègre des aliments plaisir sans culpabilité 1 à 2 fois par semaine.' },
      { title: '4. Par où commencer concrètement', content: 'Semaine 1 : ajoute un légume supplémentaire à chaque repas. Semaine 2 : remplace les féculents raffinés par des versions complètes. Semaine 3 : assure-toi d\'avoir une source de protéines à chaque repas. Semaine 4 : réduis les sucres ajoutés dans les boissons. Ces petites habitudes empilées créent de vrais changements durables.' },
    ],
    tips: ['Mange à heures régulières pour éviter les fringales', 'Prépare tes repas de la semaine le dimanche (meal prep)', 'Lis les étiquettes : moins de 5 ingrédients = produit peu transformé'],
    avoid: ['Les régimes très restrictifs (moins de 1200 kcal)', 'Supprimer des groupes alimentaires entiers', 'Manger devant les écrans (on consomme 30% de plus)'],
    numbers: [
      { val: '½', lbl: 'Légumes dans l\'assiette', color: '#22c55e' },
      { val: '¼', lbl: 'Protéines', color: '#3b82f6' },
      { val: '¼', lbl: 'Féculents complets', color: '#eab308' },
    ],
  },
  {
    id: 2, emoji: '⚗️', cat: 'nutrition', readMin: 7,
    title: 'Comprendre les macronutriments',
    summary: 'Protéines, glucides, lipides : chaque macronutriment a un rôle précis dans ton corps. Comprendre leurs fonctions te permet de manger intelligemment sans te priver.',
    steps: [
      { title: '1. Les protéines — le matériau de construction', content: 'Les protéines sont les briques de ton corps : elles construisent et réparent les muscles, fabriquent les enzymes et les hormones, et renforcent le système immunitaire. Elles rassasient longuement (effet coupe-faim). Besoin : 1,2 à 2g par kg de poids selon ton activité physique. Sources animales : viande, poisson, œufs, produits laitiers. Sources végétales : légumineuses (lentilles, pois chiches), tofu, tempeh, edamame, quinoa.' },
      { title: '2. Les glucides — le carburant de ton cerveau et tes muscles', content: 'Les glucides sont la principale source d\'énergie, surtout pour le cerveau (qui consomme 20% de ton énergie totale) et les muscles lors d\'un effort intense. La clé : distinguer les bons glucides (index glycémique bas) des mauvais. Bons glucides : avoine, riz complet, patate douce, légumineuses, fruits entiers, pain complet. Mauvais : pain blanc, sucre raffiné, sodas, confiseries, céréales soufflées sucrées.' },
      { title: '3. Les lipides — indispensables, pas tes ennemis', content: 'Les graisses sont essentielles : elles transportent les vitamines A, D, E et K, fabriquent les hormones (dont les hormones sexuelles), protègent les organes vitaux et participent à la santé cérébrale. Bonnes graisses : huile d\'olive, avocat, oléagineux, poissons gras (saumon, maquereau, sardine), graines de lin et chia. Mauvaises graisses : huile de palme, graisses hydrogénées, fast-food, produits ultra-transformés.' },
      { title: '4. Comment les équilibrer au quotidien', content: 'Pour 2000 kcal : 45-55% de glucides (225-275g), 25-35% de lipides (55-75g), 15-25% de protéines (75-125g). Ce n\'est pas une règle rigide : ajuste selon ton objectif. En perte de poids, monte les protéines à 30% et réduis les glucides raffinés. En prise de masse, monte les glucides complexes. En maintien, ces proportions conviennent parfaitement.' },
    ],
    tips: ['Combine protéines végétales pour couvrir tous les acides aminés essentiels', 'Les lipides ralentissent l\'absorption des sucres — toujours ajouter un peu de matière grasse à un repas sucré', 'Ne supprime jamais totalement les glucides — ton cerveau en a besoin'],
    avoid: ['Les régimes "no carb" ou "no fat" — incomplets et dangereux sur le long terme', 'Les protéines en poudre comme seule source de protéines', 'Confondre "faible en gras" et "sain" — souvent compensé par du sucre'],
  },
  {
    id: 3, emoji: '💧', cat: 'nutrition', readMin: 4,
    title: 'Hydratation : bien plus que boire de l\'eau',
    summary: 'Ton corps est composé à 60% d\'eau. Une déshydratation de seulement 2% réduit les performances cognitives de 20% et les performances physiques de 30%.',
    steps: [
      { title: '1. Pourquoi l\'eau est vitale', content: 'L\'eau transporte les nutriments dans tes cellules, régule ta température corporelle via la transpiration, élimine les déchets par les reins et les selles, lubrifie les articulations et les disques vertébraux, et est indispensable à toutes les réactions métaboliques. Sans eau, tous ces processus ralentissent — tu ressens fatigue, maux de tête, difficultés de concentration.' },
      { title: '2. Combien boire exactement', content: 'La règle générale : 35ml par kg de poids corporel par jour. Pour 70kg = 2,45L. Mais ce chiffre augmente avec l\'activité physique (+500ml à +1L selon la durée), la chaleur, l\'altitude, ou si tu es enceinte ou allaites. Astuce : tes urines doivent être jaune pâle — jaune foncé signifie déshydratation, incolore signifie sur-hydratation.' },
      { title: '3. Quand et comment boire', content: '1 grand verre dès le réveil (réhydrate après 8h sans boire), 1 verre avant chaque repas (réduit l\'appétit de 13%), régulièrement tout au long de la journée plutôt qu\'en grande quantité d\'un coup. Pendant l\'effort : 150-200ml toutes les 15-20 minutes. Après l\'effort : 1,5L pour chaque kilo perdu à la transpiration.' },
      { title: '4. Les autres sources d\'hydratation', content: 'Tisanes et infusions : comptent comme eau. Thé vert : comptent (la caféine a un léger effet diurétique mais reste positif). Café : 1-2 tasses par jour comptent. Fruits et légumes : contribuent jusqu\'à 20% de ton apport hydrique (concombre 96% eau, tomate 94%, pastèque 92%). À éviter pour s\'hydrater : sodas, boissons sucrées et alcool qui déshydratent.' },
    ],
    tips: ['Garde une bouteille de 1L visible sur ton bureau — tu boiras plus naturellement', 'Ajoute des tranches de citron, concombre ou menthe fraîche pour rendre l\'eau plus appétissante', 'Mange de la soupe — source d\'hydratation souvent négligée'],
    numbers: [
      { val: '35ml', lbl: 'Par kg de poids/jour', color: '#3b82f6' },
      { val: '+500ml', lbl: 'Par heure d\'effort', color: '#22c55e' },
      { val: '2%', lbl: 'Déshydratation = -20% cognitif', color: '#ef4444' },
    ],
  },
  {
    id: 4, emoji: '🌅', cat: 'nutrition', readMin: 5,
    title: 'Le petit-déjeuner idéal selon ton objectif',
    summary: 'Le petit-déjeuner casse le jeûne nocturne et donne le ton métabolique de la journée. Mais il n\'est pas obligatoire — l\'important c\'est ce qui convient à ton rythme.',
    steps: [
      { title: '1. Les règles d\'un bon petit-déjeuner', content: 'Un bon petit-déjeuner doit : stabiliser la glycémie pour éviter les fringales de 10h, apporter des protéines pour la satiété, inclure des fibres pour le transit, et te donner de l\'énergie sans pic d\'insuline. La durée idéale : mange assis, tranquillement, en 15-20 minutes.' },
      { title: '2. Formule gagnante selon ton objectif', content: 'Perte de poids : œufs brouillés + légumes + pain complet + café/thé sans sucre. Prise de masse : flocons d\'avoine + banane + beurre d\'amande + lait + whey optionnel. Endurance : pain complet + miel + yaourt grec + fruits secs. Végétarien : tofu scramble + pain complet + avocat + graines de chia.' },
      { title: '3. Ce qui sabote ton matin', content: 'Les céréales sucrées industrielles (souvent 30-40g de sucre/100g) créent un pic glycémique suivi d\'une chute brutale — tu as faim à 10h. Les jus de fruits sans fibres = sucre rapide. Le café seul à jeun stimule le cortisol et stresse les glandes surrénales. La viennoiserie industrielle = sucre + graisses trans sans valeur nutritive.' },
      { title: '4. Et si tu n\'as pas faim le matin ?', content: 'Ne force pas. Si tu pratiques le jeûne intermittent ou que tu n\'as simplement pas faim, attends. L\'important est d\'avoir un vrai premier repas équilibré quand la faim arrive. Certaines personnes fonctionnent très bien avec un petit-déjeuner léger (café + yaourt) et un déjeuner plus copieux. Écoute ton corps.' },
    ],
    tips: ['Prépare ton petit-déjeuner la veille (overnight oats, œufs durs) pour gagner du temps', 'Un petit-déjeuner protéiné réduit les apports caloriques de 15-20% sur la journée', 'Mâche 20-30 fois chaque bouchée — ça améliore la digestion et la satiété'],
    avoid: ['Céréales avec >15g de sucre/100g', 'Jus de fruits industriels', 'Manger devant ton téléphone'],
  },
  {
    id: 5, emoji: '😤', cat: 'nutrition', readMin: 5,
    title: 'Gérer les fringales et l\'alimentation émotionnelle',
    summary: 'On mange pour bien plus que la faim — stress, ennui, tristesse, récompense. Comprendre pourquoi tu manges est aussi important que ce que tu manges.',
    steps: [
      { title: '1. Faim physique vs faim émotionnelle', content: 'La faim physique s\'installe progressivement, peut attendre, disparaît avec n\'importe quel aliment et te laisse en paix après avoir mangé. La faim émotionnelle arrive soudainement, est très sélective (souvent sucré ou gras), persiste même après avoir mangé et génère culpabilité. Avant de manger, pose-toi la question : "Est-ce que j\'ai vraiment faim ou est-ce que je ressens quelque chose que je veux calmer ?"' },
      { title: '2. Les 5 déclencheurs les plus courants', content: 'Stress : le cortisol augmente l\'appétit pour le sucré et le gras — réflexe de survie ancestral. Ennui : on mange pour "faire quelque chose". Fatigue : le cerveau cherche du glucose rapide pour compenser le manque de sommeil (la ghréline augmente de 15% après une mauvaise nuit). Tristesse : la sérotonine baisse, le sucre crée un pic artificiel de bien-être. Récompense : "j\'ai bien travaillé, je mérite..."' },
      { title: '3. Stratégies anti-fringales efficaces', content: 'La règle des 10 minutes : avant de craquer, attends 10 min et bois 2 grands verres d\'eau. La fringale physique reste, l\'émotionnelle passe souvent. Mange des protéines à chaque repas — elles stabilisent la glycémie sur 4-5h. Prévois des collations saines accessibles : poignée d\'amandes, yaourt grec, pomme + beurre d\'amande. Identifie tes déclencheurs en tenant un journal alimentaire-émotionnel pendant 2 semaines.' },
      { title: '4. Construire une relation saine à la nourriture', content: 'La règle 80/20 : mange sainement 80% du temps et laisse-toi 20% de plaisir sans culpabilité. Pas d\'aliment interdit — la restriction totale renforce l\'obsession. Mange en pleine conscience : assis, sans écran, en savourant chaque bouchée. Si tu te reconnais dans l\'alimentation émotionnelle chronique, un suivi avec un diététicien ou psychologue spécialisé peut changer la donne.' },
    ],
    tips: ['Tiens un journal "faim-émotion" pendant 2 semaines — les patterns apparaissent vite', 'Substituts sains pour les envies de sucré : dattes + amandes, chocolat noir 70%, yaourt grec + miel', 'L\'exercice physique réduit les envies d\'alimentation émotionnelle de 50%'],
  },
  {
    id: 6, emoji: '🏃', cat: 'sport', readMin: 6,
    title: 'Nutrition sportive : avant, pendant, après l\'effort',
    summary: 'Ce que tu manges autour de tes entraînements impacte directement tes performances, ta récupération et tes résultats. Voici le protocole complet.',
    steps: [
      { title: '1. Avant l\'effort : le plein d\'énergie', content: '2-3h avant : repas complet riche en glucides complexes, modéré en protéines, pauvre en graisses et fibres (pour faciliter la digestion). Exemples : riz + poulet + légumes cuits, pâtes complètes + thon + sauce tomate, pain complet + œufs + banane. 30-60 min avant : collation légère si besoin — banane, barre de céréales, dattes. Évite : aliments gras, frits, très fibreux qui restent longtemps dans l\'estomac.' },
      { title: '2. Pendant l\'effort : maintenir l\'énergie', content: 'Effort < 1h : eau suffisante (150ml toutes les 15-20 min). Effort 1-2h : eau + source de glucides rapides toutes les 45 min (1 banane, 30g de raisins secs, gel énergétique). Effort > 2h : boisson isotonique (eau + sel + sucre) + solide toutes les heures. Règle d\'or : n\'attends pas d\'avoir soif pour boire.' },
      { title: '3. Après l\'effort : la fenêtre anabolique', content: 'Les 30-45 minutes après l\'effort sont cruciales — les muscles sont comme des éponges, ils absorbent les nutriments plus efficacement. La combinaison idéale : 20-40g de protéines + glucides (ratio 1:3). Exemples concrets : yaourt grec 0% + banane + miel, shaker whey + eau + banane, blanc de poulet + riz blanc + légumes, lait chocolaté (combo parfait protéines/glucides natif).' },
      { title: '4. Nutrition pour différents objectifs sportifs', content: 'Perte de poids + sport : léger déficit calorique (300 kcal max), maintien des protéines élevé, réduction des glucides autour des séances seulement. Prise de masse musculaire : surplus de 200-300 kcal, 1,8-2g protéines/kg, glucides abondants autour des séances. Endurance : priorité aux glucides (5-7g/kg/jour), protéines 1,2-1,6g/kg, attention aux pertes en sel lors des efforts longs.' },
    ],
    tips: ['Prépare ta collation post-entraînement avant d\'aller au sport pour ne pas sauter cette étape', 'La créatine monohydrate est le seul supplément vraiment prouvé pour la performance (3-5g/jour)', 'Les betteraves améliorent l\'endurance de 1-3% — jus de betterave 2h avant l\'effort'],
    numbers: [
      { val: '30min', lbl: 'Fenêtre post-effort idéale', color: '#3b82f6' },
      { val: '20-40g', lbl: 'Protéines après l\'effort', color: '#22c55e' },
      { val: '1:3', lbl: 'Ratio protéines/glucides récup', color: '#f97316' },
    ],
  },
  {
    id: 7, emoji: '🦠', cat: 'nutrition', readMin: 5,
    title: 'Microbiote intestinal : le 2ème cerveau',
    summary: 'Ton intestin abrite 100 000 milliards de bactéries qui influencent ton humeur, ton immunité, ton poids et même tes envies alimentaires.',
    steps: [
      { title: '1. Pourquoi ton microbiote est crucial', content: 'Le microbiote intestinal est impliqué dans la digestion et l\'absorption des nutriments, la production de 90% de la sérotonine (hormone du bonheur), la régulation du système immunitaire (70% de tes défenses sont dans l\'intestin), la prévention de l\'inflammation chronique, et même dans la régulation du poids (certaines bactéries extraient plus de calories des aliments).' },
      { title: '2. Ce qui nourrit le bon microbiote', content: 'Les fibres prébiotiques (nourriture des bonnes bactéries) : ail, oignon, poireau, asperge, artichaut, banane verte, avoine, chicorée. Les aliments fermentés (contiennent des bonnes bactéries) : yaourt nature, kéfir, choucroute crue, kimchi, miso, kombucha, fromages fermentés. La variété : vise 30 végétaux différents par semaine — légumes, fruits, céréales, légumineuses, herbes, épices.' },
      { title: '3. Ce qui détruit le microbiote', content: 'Antibiotiques (nécessaires mais éliminent bactéries bonnes et mauvaises), sucres raffinés en excès (nourrissent les mauvaises bactéries), alcool en excès, aliments ultra-transformés, stress chronique (l\'axe intestin-cerveau fonctionne dans les deux sens), manque de fibres (les bonnes bactéries meurent faute de nourriture).' },
      { title: '4. Programme réparation en 4 semaines', content: 'Semaine 1 : ajoute 1 aliment fermenté par jour (yaourt, kéfir). Semaine 2 : intègre 2-3 portions de légumes prébiotiques par jour. Semaine 3 : vise la variété — 10 légumes différents cette semaine. Semaine 4 : teste un nouvel aliment fermenté (kimchi, kombucha). Maintien : objectif 30 végétaux différents par semaine sur le long terme.' },
    ],
    tips: ['Le kéfir de lait contient 10x plus de bonnes bactéries qu\'un yaourt classique', 'La choucroute crue (non pasteurisée) est l\'une des meilleures sources de probiotiques', 'Mange les pelures de légumes et fruits biologiques — riches en fibres prébiotiques'],
  },
  {
    id: 8, emoji: '🌙', cat: 'mindset', readMin: 4,
    title: 'Sommeil et alimentation : le lien méconnu',
    summary: 'Mal dormir rend affamé, fait grossir et sabote tous tes efforts. Le sommeil est le pilier le plus sous-estimé de la santé.',
    steps: [
      { title: '1. Ce que le manque de sommeil fait à ton appétit', content: 'Après une mauvaise nuit, ton corps produit 15% de ghréline en plus (hormone de la faim) et 15% de leptine en moins (hormone de la satiété). Résultat : tu manges en moyenne 300-500 kcal de plus le lendemain, avec des envies particulièrement fortes pour le sucré et le gras. Ton cerveau cherche une compensation énergétique rapide.' },
      { title: '2. Alimentation pour améliorer le sommeil', content: 'Le soir, favorise : des glucides complexes (favorisent l\'entrée du tryptophane dans le cerveau), des aliments riches en mélatonine (cerises, noix, graines), des infusions apaisantes (valériane, passiflore, camomille). Évite : caféine après 14h (reste 8h dans ton sang), repas trop lourd dans les 3h précédant le coucher, alcool (perturbe le sommeil paradoxal), sucres rapides le soir.' },
      { title: '3. Le cercle vertueux sommeil-alimentation', content: 'Bien dormir → meilleure régulation hormonale → moins de fringales → meilleurs choix alimentaires → meilleure digestion → meilleur sommeil. Le cercle peut aussi être vertueux dans l\'autre sens : manger équilibré → glycémie stable → endormissement plus facile → sommeil de meilleure qualité. Les deux piliers se renforcent mutuellement.' },
      { title: '4. Hygiène du sommeil pratique', content: 'Couche-toi et lève-toi à la même heure 7j/7 (même le week-end). Température idéale : 16-18°C. Écrans hors de la chambre 1h avant de dormir (la lumière bleue bloque la mélatonine). Obscurité totale ou masque de sommeil. Une légère collation riche en tryptophane 1h avant de dormir peut aider : 2 noix + 1 banane, ou 1 yaourt + miel.' },
    ],
    tips: ['Le magnésium (200-400mg avant de dormir) améliore la qualité du sommeil profond', 'Même 20 minutes de marche le matin améliore le sommeil de la nuit suivante', 'La caféine a une demi-vie de 5-7h — un café à 15h peut encore perturber ton sommeil à minuit'],
  },
  {
    id: 9, emoji: '🔥', cat: 'nutrition', readMin: 5,
    title: 'Anti-inflammation par l\'alimentation',
    summary: 'L\'inflammation chronique est à l\'origine de la plupart des maladies modernes. Tu peux l\'influencer directement par tes choix alimentaires quotidiens.',
    steps: [
      { title: '1. L\'inflammation chronique expliquée', content: 'L\'inflammation aiguë (rougeur, chaleur après une blessure) est protectrice. L\'inflammation chronique de bas grade est invisible mais dévastatrice — elle est associée aux maladies cardiovasculaires, diabète type 2, cancers, maladies auto-immunes, dépression, Alzheimer. Elle est alimentée par une alimentation pro-inflammatoire, le surpoids, le manque de sommeil, le stress chronique et la sédentarité.' },
      { title: '2. Le top 10 des aliments anti-inflammatoires', content: '1. Poissons gras (saumon, sardine, maquereau) — oméga-3 EPA et DHA. 2. Huile d\'olive extra-vierge — polyphénols et acide oléocanthal. 3. Fruits rouges et baies — anthocyanes puissants. 4. Curcuma + poivre noir — la curcumine est un anti-inflammatoire naturel puissant. 5. Gingembre — gingérols et shogaols. 6. Légumes verts feuillus — chlorophylle et vitamine K2. 7. Noix et amandes — vitamine E et oméga-3 ALA. 8. Ail et oignon crus — allicine. 9. Thé vert — EGCG. 10. Chocolat noir 85%+ — flavonoïdes.' },
      { title: '3. Les grands pro-inflammatoires à réduire', content: 'Sucres ajoutés et raffinés : activent les cytokines pro-inflammatoires. Huiles végétales riches en oméga-6 (tournesol, maïs, soja) en excès : déséquilibrent le ratio oméga-6/oméga-3. Charcuteries et viandes transformées : nitrites et AGE. Aliments ultra-transformés : additifs, graisses trans. Alcool en excès : endommage la paroi intestinale (leaky gut).' },
      { title: '4. Le régime méditerranéen : le modèle anti-inflammatoire', content: 'Le régime méditerranéen est le plus étudié et validé scientifiquement. Ses principes : abondance de légumes, fruits, légumineuses, noix, céréales complètes. Huile d\'olive comme corps gras principal. Poisson 2-3 fois par semaine. Viande rouge limitée à 1-2 fois par semaine. Peu d\'aliments transformés. Des études montrent une réduction de 30% du risque cardiovasculaire.' },
    ],
    tips: ['Ajoute 1 cuillère à café de curcuma + poivre dans tes plats chauds chaque jour', 'Consomme des poissons gras au moins 2 fois par semaine', 'Les baies surgelées sont aussi anti-inflammatoires que les fraîches — et moins chères'],
    numbers: [
      { val: '30%', lbl: 'Réduction risque cardio (régime méditerranéen)', color: '#22c55e' },
      { val: '2x/sem', lbl: 'Poissons gras recommandés', color: '#3b82f6' },
      { val: '85%+', lbl: 'Cacao minimal pour les bénéfices', color: '#92400e' },
    ],
  },
  {
    id: 10, emoji: '🛒', cat: 'mindset', readMin: 4,
    title: 'Faire ses courses comme un nutritionniste',
    summary: 'Un caddie bien pensé c\'est une semaine réussie. 80% de tes choix alimentaires se font au supermarché, pas devant ton frigo.',
    steps: [
      { title: '1. Les règles d\'or du rayon', content: 'Fais tes courses après avoir mangé — la faim double les achats impulsifs. Commence par le tour du magasin (légumes, fruits, poissons, viandes en périphérie) avant les rayons centraux (produits transformés). Fais une liste et respecte-la. Évite les rayons confiseries et chips — ce que tu n\'achètes pas, tu ne peux pas le manger.' },
      { title: '2. Lire les étiquettes efficacement', content: 'La liste d\'ingrédients : les 3 premiers ingrédients = 80% du produit. Si le sucre est dans les 3 premiers → à limiter. Moins de 5 ingrédients = produit peu transformé = bon signe. Méfie-toi des nombreux synonymes du sucre : sirop de glucose, maltose, dextrose, saccharose, jus de fruits concentrés. Pour les matières grasses : fuis les graisses hydrogénées (= graisses trans) et l\'huile de palme.' },
      { title: '3. Le panier idéal pour la semaine', content: 'Protéines : 500g de viande blanche ou rouge, 300g de poisson (dont 1 poisson gras), 6 œufs, 500g de légumineuses. Légumes : minimum 5 variétés différentes, 1,5-2kg total. Fruits : 5-6 sortes, viser la couleur et la variété. Féculents complets : riz brun, pâtes complètes, pain complet, flocons d\'avoine. Matières grasses : huile d\'olive, noix, amandes.' },
      { title: '4. Les aliments sains méconnus à adopter', content: 'Choux de Bruxelles : 100g couvrent 130% des besoins en vitamine C. Foie de veau : source de vitamine B12, fer et zinc incomparable. Maquereau en boîte : aussi nutritif que le frais, 3x moins cher. Lentilles corail : cuisent en 15 min sans trempage, riches en fer et protéines. Graines de courge : magnésium, zinc, oméga-3. Kéfir : microbiote +++ pour 1€/jour.' },
    ],
    tips: ['Les surgelés nature (légumes, poisson) sont aussi nutritifs que le frais et moins chers', 'Achète les fruits et légumes de saison — plus nutritifs et 3x moins chers', 'Commande en ligne pour éviter les achats impulsifs si tu manques de discipline en rayon'],
  },
]

const CATS = [
  { key: 'all',       label: 'Tous' },
  { key: 'nutrition', label: '🥗 Nutrition' },
  { key: 'sport',     label: '🏃 Sport' },
  { key: 'mindset',   label: '🧘 Mindset' },
]

export default function AdvicePage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState<Conseil | null>(null)
  const [openStep, setOpenStep] = useState<number | null>(null)

  const visible = CONSEILS.filter(c => {
    const matchCat   = filter === 'all' || c.cat === filter
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.summary.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="page">

      {/* Modal article */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) { setOpen(null); setOpenStep(null) } }}>
          <div className="bg-white w-full rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{open.emoji}</span>
                <div>
                  <h2 className="font-extrabold text-zinc-900 text-sm leading-tight pr-6">{open.title}</h2>
                  <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} />{open.readMin} min de lecture</span>
                </div>
              </div>
              <button onClick={() => { setOpen(null); setOpenStep(null) }}
                className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Résumé */}
              <p className="text-sm text-zinc-500 leading-relaxed italic bg-zinc-50 rounded-2xl p-4">{open.summary}</p>

              {/* Chiffres clés */}
              {open.numbers && (
                <div className="grid grid-cols-3 gap-2">
                  {open.numbers.map((n, i) => (
                    <div key={i} className="bg-zinc-50 rounded-2xl p-3 text-center">
                      <div className="text-xl font-extrabold" style={{ color: n.color }}>{n.val}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{n.lbl}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Étapes accordéon */}
              <div className="flex flex-col gap-2">
                {open.steps.map((step, i) => (
                  <div key={i} className="border border-zinc-100 rounded-2xl overflow-hidden">
                    <button onClick={() => setOpenStep(openStep === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-zinc-50 transition-colors">
                      <p className="text-sm font-bold text-zinc-900 pr-3">{step.title}</p>
                      {openStep === i
                        ? <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />
                        : <ChevronRight size={16} className="text-zinc-400 flex-shrink-0" />
                      }
                    </button>
                    {openStep === i && (
                      <div className="px-4 pb-4 text-sm text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">
                        {step.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* À faire */}
              {open.tips && (
                <div className="bg-nutri-light rounded-2xl p-4">
                  <p className="text-xs font-extrabold text-nutri-dark mb-2 uppercase tracking-wide">✅ À appliquer</p>
                  {open.tips.map((t, i) => (
                    <div key={i} className="flex gap-2 mb-2 last:mb-0">
                      <span className="text-nutri-mid flex-shrink-0 mt-0.5">•</span>
                      <p className="text-sm text-nutri-dark leading-snug">{t}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* À éviter */}
              {open.avoid && (
                <div className="bg-red-50 rounded-2xl p-4">
                  <p className="text-xs font-extrabold text-red-700 mb-2 uppercase tracking-wide">⚠️ À éviter</p>
                  {open.avoid.map((t, i) => (
                    <div key={i} className="flex gap-2 mb-2 last:mb-0">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                      <p className="text-sm text-red-700 leading-snug">{t}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">Conseils nutrition</h1>
        <p className="text-sm text-zinc-400">{CONSEILS.length} guides complets</p>
      </div>

      <Waty mode="nutrition" message="Clique sur un guide pour le lire en détail — chaque étape est déroulable 📖" size="sm" />

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-3">
        <input type="text" placeholder="Rechercher un conseil…" value={search}
          onChange={e => setSearch(e.target.value)} className="input" />
        <div className="flex gap-2 flex-wrap">
          {CATS.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === c.key ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste articles */}
      <div className="flex flex-col gap-3">
        {visible.map(c => (
          <button key={c.id} onClick={() => { setOpen(c); setOpenStep(0) }}
            className="card text-left hover:shadow-md transition-all active:scale-[0.98] group">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-sm text-zinc-900 leading-tight">{c.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 capitalize flex-shrink-0">
                    {c.cat}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1 line-clamp-2">{c.summary}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} />{c.readMin} min · {c.steps.length} étapes</span>
                  <ChevronRight size={14} className="text-zinc-300 group-hover:text-nutri transition-colors" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card text-center py-10 text-zinc-400">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm">Aucun conseil trouvé.</p>
        </div>
      )}
    </div>
  )
}
