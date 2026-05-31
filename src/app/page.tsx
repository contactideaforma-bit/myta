import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  // Si déjà connecté → dashboard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>

      {/* ── Header ── */}
      <header className="px-5 py-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <img src="/logo_my_twin_app.png" alt="My Twin App" className="h-8 object-contain" />
        <Link href="/auth"
          className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all"
          style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
          Connexion
        </Link>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center px-5 py-8 max-w-lg mx-auto w-full gap-10">

        {/* Hero section */}
        <div className="flex flex-col items-center text-center gap-5">
          <img src="/logo_my_twin_app.png" alt="My Twin App" className="w-56 object-contain drop-shadow-sm" />

          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">
            Ton coach digital<br />personnel
          </h1>
          <p className="text-zinc-500 text-base leading-relaxed max-w-xs">
            Nutrition, sport et sommeil réunis dans une seule app. Guidé par l'IA, personnalisé pour toi.
          </p>

          {/* Pills modules */}
          <div className="flex gap-2 flex-wrap justify-center">
            {[
              { label: '🥗 Nutrition', color: 'bg-nutri-light text-nutri-dark border-nutri/20' },
              { label: '🏋️ Sport',     color: 'bg-sport-light text-sport-dark border-sport/20' },
              { label: '😴 Sommeil',   color: 'bg-tta-light text-tta-mid border-tta-mid/20' },
            ].map(p => (
              <span key={p.label} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${p.color}`}>
                {p.label}
              </span>
            ))}
          </div>

          {/* CTA principal */}
          <Link href="/auth"
            className="flex items-center justify-center gap-2 w-full max-w-xs py-4 rounded-2xl text-white text-base font-bold shadow-lg transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
            Commencer — 3 jours gratuits
          </Link>
          <p className="text-xs text-zinc-400">Sans engagement · Annulable à tout moment</p>
        </div>

        {/* ── Features ── */}
        <div className="w-full flex flex-col gap-3">
          <h2 className="text-lg font-extrabold text-zinc-900 text-center">Tout ce dont tu as besoin</h2>
          {[
            { icon: '📔', title: 'Journal alimentaire intelligent', desc: 'Base de données de milliers d\'aliments. Macros calculés automatiquement.' },
            { icon: '🤖', title: 'Coach IA — Waty', desc: 'Ton coach personnel qui analyse tes données et te donne des conseils personnalisés chaque semaine.' },
            { icon: '🏋️', title: 'Suivi sportif complet', desc: 'Logger tes séances, timer Tabata vocal, historique et statistiques.' },
            { icon: '😴', title: 'Suivi du sommeil', desc: 'Enregistre tes nuits et visualise l\'impact sur tes performances.' },
            { icon: '📊', title: 'Bilan santé hebdomadaire', desc: 'Rapport IA complet sur ta nutrition, ton sport, ton sommeil et ton poids.' },
            { icon: '🍽️', title: 'Recettes IA personnalisées', desc: 'Génère des recettes selon tes ingrédients et tes objectifs nutritionnels.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-4 flex items-start gap-3 shadow-sm border border-zinc-100">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-bold text-zinc-900">{f.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pricing ── */}
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-lg font-extrabold text-zinc-900 text-center">Un tarif simple et transparent</h2>

          <div className="bg-white rounded-3xl p-6 shadow-lg border border-zinc-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">MYTA Premium</p>
                <p className="text-3xl font-black text-zinc-900 mt-1">3,99€<span className="text-base font-medium text-zinc-400">/mois</span></p>
                <p className="text-xs text-zinc-400 mt-0.5">ou 39,99€/an — économise 16%</p>
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
                👑
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {[
                'Accès à toutes les fonctionnalités',
                'Journal alimentaire illimité',
                'Coach IA Waty illimité',
                'Recettes IA personnalisées',
                'Rapports santé hebdomadaires',
                'Application installable sur mobile',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-700">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px]"
                    style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/auth"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
              Essayer 3 jours gratuitement
            </Link>
            <p className="text-center text-xs text-zinc-400">Aucun débit pendant 3 jours</p>
          </div>
        </div>

        {/* ── Installer l'app ── */}
        <div className="w-full bg-tta-light border border-tta-mid/20 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">📱</span>
          <div>
            <p className="text-sm font-bold text-tta-mid">Installe l'app sur ton téléphone</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              <strong>iPhone :</strong> Safari → icône partager → "Sur l'écran d'accueil"<br />
              <strong>Android :</strong> Chrome → menu → "Ajouter à l'écran d'accueil"
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="w-full flex flex-col items-center gap-3 pt-4 border-t border-zinc-200">
          <p className="text-xs text-zinc-400 text-center">© 2026 IDEAFORMA — My Twin App</p>
          <div className="flex gap-4">
            <Link href="/legal" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Mentions légales</Link>
            <Link href="/legal#cgu" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">CGU</Link>
            <Link href="/legal#confidentialite" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Confidentialité</Link>
          </div>
          <p className="text-xs text-zinc-300">🔒 Paiement sécurisé par Stripe · Données hébergées en Europe</p>
        </footer>
      </main>
    </div>
  )
}
