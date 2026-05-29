'use client'

import { useState } from 'react'
import { X, Clock, ChevronRight } from 'lucide-react'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'

interface Conseil {
  id: number
  emoji: string
  cat: 'nutrition' | 'sport' | 'mindset'
  readMin: number
  title: string
  summary: string
  sections: Section[]
}

interface Section {
  type: 'text' | 'tips' | 'good-bad' | 'key-numbers'
  title?: string
  text?: string
  items?: { icon?: string; text: string }[]
  good?: string[]
  bad?: string[]
  numbers?: { val: string; lbl: string; color: string }[]
}

const CONSEILS: Conseil[] = [
  {
    id: 1, emoji: '🥗', cat: 'nutrition', readMin: 4,
    title: 'Les bases du rééquilibrage alimentaire',
    summary: "Le rééquilibrage alimentaire n'est pas un régime mais un changement de mode de vie durable. Apprenez à manger varié, équilibré et sans frustration.",
    sections: [
      { type: 'text', title: "🎯 Qu'est-ce que le rééquilibrage ?", text: "Contrairement aux régimes restrictifs, le rééquilibrage alimentaire ne s'appuie pas sur la privation mais sur l'apprentissage de nouveaux comportements. L'objectif est d'atteindre un équilibre nutritionnel global sur plusieurs jours, et non de perfectionner chaque repas isolément." },
      { type: 'tips', title: '✅ Les 5 piliers essentiels', items: [
        { icon: '🌈', text: 'Variété : manger de tout en quantités adaptées. Aucun aliment n\'est interdit, seul l\'excès pose problème.' },
        { icon: '🥦', text: 'Légumes à chaque repas : visez la moitié de votre assiette en légumes variés.' },
        { icon: '💧', text: 'Hydratation : 1,5 à 2L d\'eau par jour, plus lors des activités physiques.' },
        { icon: '⏰', text: 'Régularité des repas : des horaires stables stabilisent la glycémie et réduisent les fringales.' },
        { icon: '🧘', text: 'Pleine conscience : mangez lentement, savourez et écoutez vos signaux de satiété.' },
      ]},
      { type: 'key-numbers', title: "📊 Les proportions d'une assiette équilibrée", numbers: [
        { val: '½', lbl: 'Légumes et fruits', color: '#22c55e' },
        { val: '¼', lbl: 'Protéines (viande, poisson, légumineuses)', color: '#3b82f6' },
        { val: '¼', lbl: 'Féculents complets (riz, pâtes, pain)', color: '#eab308' },
      ]},
    ],
  },
  {
    id: 2, emoji: '⚗️', cat: 'nutrition', readMin: 5,
    title: 'Comprendre les macronutriments',
    summary: 'Protéines, glucides, lipides : chaque macronutriment joue un rôle précis. Savoir les doser vous permet d\'optimiser votre énergie et votre composition corporelle.',
    sections: [
      { type: 'text', title: '🔬 Les trois grands carburants', text: "Les macronutriments sont les sources d'énergie de l'organisme. Protéines (4 kcal/g), glucides (4 kcal/g) et lipides (9 kcal/g) doivent être consommés en proportions adaptées à vos objectifs. Il n'y a pas de \"bon\" ni de \"mauvais\" macro — c'est l'équilibre global qui compte." },
      { type: 'tips', title: '💡 Ce qu\'il faut retenir sur chaque macro', items: [
        { icon: '💪', text: 'Protéines : construisent et réparent les muscles. Besoin : 1,2 à 2 g/kg selon l\'activité. Sources : volaille, poisson, œufs, légumineuses.' },
        { icon: '⚡', text: 'Glucides : carburant principal du cerveau et des muscles. Privilégiez les glucides complexes (index glycémique bas).' },
        { icon: '🫙', text: 'Lipides : essentiels pour les hormones et l\'absorption des vitamines. Privilégiez huile d\'olive, avocats, poissons gras.' },
      ]},
    ],
  },
  {
    id: 3, emoji: '💧', cat: 'nutrition', readMin: 3,
    title: "Hydratation : l'aliment oublié",
    summary: "L'eau est impliquée dans toutes les fonctions vitales. Une déshydratation même légère affecte l'énergie, la concentration et le métabolisme.",
    sections: [
      { type: 'text', title: "🔬 Pourquoi l'eau est-elle si importante ?", text: "Le corps est composé à 60 % d'eau. Elle transporte les nutriments, régule la température corporelle, facilite la digestion et élimine les déchets. Une perte de seulement 2 % du poids corporel en eau suffit à diminuer les performances physiques et cognitives de 20 %." },
      { type: 'key-numbers', title: '📊 Chiffres clés', numbers: [
        { val: '1,5L', lbl: 'Minimum par jour (hors activité physique)', color: '#3b82f6' },
        { val: '+0,5L', lbl: 'Par heure d\'effort sportif', color: '#22c55e' },
        { val: '20%', lbl: 'Perte de performance dès 2% de déshydratation', color: '#ef4444' },
      ]},
      { type: 'tips', title: '✅ Astuces pour boire suffisamment', items: [
        { icon: '🌅', text: 'Commencer la journée par un grand verre d\'eau à jeun — cela réveille le métabolisme.' },
        { icon: '📱', text: 'Utiliser une bouteille de 1L et viser à la remplir au moins une fois dans la journée.' },
        { icon: '🍵', text: 'Les tisanes et infusions comptent. Évitez d\'y substituer les boissons sucrées.' },
      ]},
    ],
  },
  {
    id: 4, emoji: '🌅', cat: 'nutrition', readMin: 4,
    title: 'Le petit-déjeuner idéal',
    summary: "Un petit-déjeuner équilibré stabilise la glycémie, booste la concentration et réduit les fringales en matinée.",
    sections: [
      { type: 'good-bad', title: '✅ Bons choix vs. Pièges courants',
        good: ["Flocons d'avoine ou pain complet", 'Œuf, yaourt grec ou fromage blanc', 'Fruits frais entiers', 'Graines : chia, lin, courge', 'Thé vert ou café non sucré'],
        bad: ['Céréales soufflées sucrées (>15g sucre/100g)', 'Jus de fruits industriels', 'Viennoiseries industrielles', 'Pain blanc sans accompagnement protéiné'],
      },
      { type: 'tips', title: '🍽️ La formule gagnante', items: [
        { icon: '🌾', text: '1 portion de glucides complexes : flocons d\'avoine, pain complet.' },
        { icon: '💪', text: '1 source de protéines : œuf, yaourt grec, fromage blanc.' },
        { icon: '🍎', text: '1 fruit frais entier (pas en jus pour garder les fibres).' },
      ]},
    ],
  },
  {
    id: 5, emoji: '😤', cat: 'nutrition', readMin: 4,
    title: 'Gérer les fringales et les envies',
    summary: "Les fringales ne sont pas toujours liées à la faim réelle. Apprenez à les reconnaître et à y répondre intelligemment.",
    sections: [
      { type: 'text', title: '🔍 Faim physique ou faim émotionnelle ?', text: "La faim physique s'installe progressivement, peut attendre et disparaît en mangeant de tout. La faim émotionnelle arrive soudainement, est sélective (souvent sucrée ou grasse) et persiste même après avoir mangé." },
      { type: 'tips', title: '✅ Stratégies anti-fringales', items: [
        { icon: '⏱️', text: 'La règle des 10 minutes : avant de céder à une envie soudaine, attendez 10 min et buvez un grand verre d\'eau.' },
        { icon: '🥜', text: 'Ayez des snacks sains à portée : poignée de noix, fruit, yaourt, carotte.' },
        { icon: '😴', text: 'Le manque de sommeil augmente la ghréline (hormone de la faim). Viser 7–9h de sommeil.' },
      ]},
    ],
  },
  {
    id: 6, emoji: '🏃', cat: 'sport', readMin: 5,
    title: 'Nutrition sportive : avant, pendant, après',
    summary: "L'alimentation autour de l'effort conditionne vos performances et votre récupération.",
    sections: [
      { type: 'tips', title: '⏰ Protocole en 3 phases', items: [
        { icon: '🕐', text: 'Avant (2-3h) : repas riche en glucides complexes, modéré en protéines, faible en graisses. Ex : riz blanc + blanc de poulet.' },
        { icon: '🕑', text: 'Pendant (effort >1h) : glucides rapides + hydratation. Ex : banane, boisson isotonique.' },
        { icon: '🕒', text: 'Après (30 min) : protéines + glucides. Ex : yaourt grec + fruits, shaker whey + banane.' },
      ]},
      { type: 'key-numbers', title: '📊 Besoins nutritionnels selon l\'activité', numbers: [
        { val: '1,2g', lbl: 'Protéines/kg · sport modéré (3h/sem)', color: '#3b82f6' },
        { val: '1,6g', lbl: 'Protéines/kg · sport intensif (5h/sem+)', color: '#22c55e' },
        { val: '2,0g', lbl: 'Protéines/kg · prise de masse + musculation', color: '#f97316' },
      ]},
    ],
  },
  {
    id: 7, emoji: '🧘', cat: 'mindset', readMin: 3,
    title: 'Le rapport émotionnel à la nourriture',
    summary: "Comprendre pourquoi vous mangez — et pas seulement quoi — est la clé d'un changement durable.",
    sections: [
      { type: 'text', title: '🧠 Manger est aussi un acte émotionnel', text: "La nourriture est liée à nos émotions, nos souvenirs et notre culture. Le stress, l'ennui, la tristesse ou la joie peuvent déclencher des comportements alimentaires automatiques. En prendre conscience, c'est reprendre le contrôle." },
      { type: 'tips', title: '💡 Vers une relation saine à l\'alimentation', items: [
        { icon: '📔', text: 'Tenez un journal alimentaire avec vos émotions du moment. Vous identifierez rapidement vos déclencheurs.' },
        { icon: '🚫', text: 'Supprimez le concept d\'aliment interdit : la restriction totale augmente la frustration et les craquages.' },
        { icon: '✅', text: 'La règle 80/20 : mangez sainement 80% du temps et laissez-vous 20% de plaisir sans culpabilité.' },
      ]},
    ],
  },
  {
    id: 8, emoji: '🛒', cat: 'mindset', readMin: 3,
    title: 'Faire ses courses intelligemment',
    summary: "Un caddie bien pensé, c'est une semaine réussie. Voici comment structurer vos achats pour manger sainement sans effort.",
    sections: [
      { type: 'tips', title: '🎯 Les règles d\'or', items: [
        { icon: '📝', text: 'Faites une liste avant d\'y aller et respectez-la. La faim et les promotions sont vos ennemis.' },
        { icon: '🌿', text: 'Faites le tour du magasin (produits frais en périphérie) avant les rayons centraux (ultra-transformés).' },
        { icon: '🏷️', text: 'Lisez les étiquettes : les 3 premiers ingrédients définissent le produit. Évitez le sucre en position 1 ou 2.' },
        { icon: '🥶', text: 'Les surgelés nature (légumes, poissons) sont aussi nutritifs que le frais et moins chers.' },
      ]},
    ],
  },
]

const CATS = [
  { key: 'all',      label: 'Tous' },
  { key: 'nutrition', label: '🥗 Nutrition' },
  { key: 'sport',     label: '🏃 Sport' },
  { key: 'mindset',   label: '🧘 Mindset' },
]

export default function AdvicePage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState<Conseil | null>(null)

  const visible = CONSEILS.filter(c => {
    const matchCat  = filter === 'all' || c.cat === filter
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.summary.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function renderSection(s: Section, i: number) {
    return (
      <div key={i} className="flex flex-col gap-2">
        {s.title && <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">{s.title}</h3>}

        {s.type === 'text' && s.text && (
          <p className="text-sm text-zinc-600 leading-relaxed">{s.text}</p>
        )}

        {s.type === 'tips' && s.items && (
          <div className="flex flex-col gap-2">
            {s.items.map((item, j) => (
              <div key={j} className="flex gap-2.5 items-start bg-zinc-50 rounded-xl p-3">
                {item.icon && <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>}
                <p className="text-sm text-zinc-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text }} />
              </div>
            ))}
          </div>
        )}

        {s.type === 'good-bad' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-nutri-light rounded-xl p-3">
              <p className="text-xs font-bold text-nutri-dark mb-2">✅ Bons choix</p>
              {s.good?.map((g, j) => <p key={j} className="text-xs text-nutri-dark py-0.5">• {g}</p>)}
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-2">⚠️ À éviter</p>
              {s.bad?.map((b, j) => <p key={j} className="text-xs text-red-600 py-0.5">• {b}</p>)}
            </div>
          </div>
        )}

        {s.type === 'key-numbers' && s.numbers && (
          <div className="grid grid-cols-3 gap-2">
            {s.numbers.map((n, j) => (
              <div key={j} className="bg-zinc-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black" style={{ color: n.color }}>{n.val}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{n.lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{open.emoji}</span>
                <div>
                  <h2 className="font-bold text-zinc-900 text-sm leading-tight">{open.title}</h2>
                  <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} />{open.readMin} min</span>
                </div>
              </div>
              <button onClick={() => setOpen(null)} className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <p className="text-sm text-zinc-500 leading-relaxed italic">{open.summary}</p>
              {open.sections.map((s, i) => renderSection(s, i))}
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Conseils nutrition</h1>
        <p className="text-sm text-zinc-400">{CONSEILS.length} articles</p>
      </div>

      <Waty
        mode="nutrition"
        message={WATY_MESSAGES.general_tip_sleep}
        size="sm"
      />

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-3">
        <input type="text" placeholder="Rechercher un conseil…" value={search}
          onChange={e => setSearch(e.target.value)} className="input" />
        <div className="flex gap-2 flex-wrap">
          {CATS.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === c.key ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map(c => (
          <button key={c.id} onClick={() => setOpen(c)}
            className="card text-left hover:border-nutri/40 hover:shadow-sm transition-all group flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 capitalize flex-shrink-0">
                {c.cat}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-zinc-900 mb-1">{c.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{c.summary}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} />{c.readMin} min</span>
              <ChevronRight size={14} className="text-zinc-300 group-hover:text-nutri transition-colors" />
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
