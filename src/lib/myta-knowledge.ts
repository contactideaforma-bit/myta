/**
 * Fiche de connaissance MYTA pour les générations IA côté admin (descriptions de vidéos,
 * campagnes). Source de vérité : ce que l'app fait réellement, rien d'inventé.
 * À tenir à jour quand une fonctionnalité sort.
 */
export const MYTA_KNOWLEDGE = `
MYTA (My Twin App) — application française de bien-être : nutrition, sport, sommeil, dans une seule app, avec un coach IA nommé Waty (mascotte pastèque, ton complice et motivant, tutoiement, jamais culpabilisant). Disponible sur iPhone (App Store), Android (Google Play) et sur le web : mytwinapp.fr. Éditée par IDEAFORMA (France).

PRINCIPE : l'utilisateur ne note pas tout, et l'app le sait. Un jour sans saisie n'est jamais compté comme un jour à 0 kcal ni une nuit blanche : les moyennes et bilans se calculent sur les jours réellement renseignés. Pas de culpabilisation, pas de données inventées.

FONCTIONNALITÉS
- Journal alimentaire : noter un repas à la voix (on dicte, Waty comprend et chiffre), par texte, ou en photo (analyse de l'assiette) ; compléments alimentaires ; calories, protéines, glucides, lipides, micronutriments ; base d'aliments française (CIQUAL) ; résumé du jour et strip des 7 derniers jours.
- Score MYTA : indice A→E propre à MYTA (pour 100 g, algorithme maison, PAS le Nutri-Score officiel) calculé sur les recettes, avec macros par portion et « impact sur ta journée ».
- Recettes : import d'une recette depuis un lien Instagram ou TikTok (on colle le lien, Waty lit la description, complète logiquement ce qui manque et le signale), depuis une capture d'écran, une photo de livre/fiche ou un texte collé ; Waty peut aussi créer des recettes sur demande (catégories : anti-inflammatoire, sans gluten, faible calories, rapide, cheat meal, protéinée, végétarien, cuisine du monde, ou par ingrédients). Chaque recette : photo, ingrédients, étapes expliquées une par une avec durées et astuces, Score MYTA, ajout au journal en une pression. Catalogue personnel avec recherche et filtres, fiche PDF imprimable, partage à un ami par lien (l'ami peut l'ajouter à son propre catalogue).
- Sport : séances par discipline, durée et calories brûlées, saisie vocale possible, objectif 3 séances par semaine, historique.
- Sommeil : heure de coucher/réveil, durée, qualité, moyenne sur les nuits renseignées.
- Poids : pesées et courbe de tendance.
- Bilan avec Waty : rapport IA sur 7 jours (nutrition, sport, sommeil, poids, carences éventuelles) avec conseils concrets, basé uniquement sur ce qui a été noté.
- Mini-jeux pour bouger la tête : « Le Grand Tri » (trier aliments sains / junk), « Waty Runner », « Floor is Lava » ; défi du jour, série, classement entre amis, paliers et skins.
- Amis et groupes : groupes d'amis, messages, classement des jeux, défis.
- Défis quotidiens et badges, série de jours renseignés.
- Notifications intelligentes (rappels repas, sommeil, pesée, bilan hebdo), réglables.
- Compte famille (profils enfants, journal enfant) et offres couple/famille.
- Conseils nutrition rédigés (anti-fringales, microbiote, anti-inflammatoire, sommeil et appétit, courses malines, etc.), adaptation aux conditions (grossesse, post-partum, périménopause, diabète, intolérances, hypertension, hypothyroïdie).

OFFRES : essai gratuit à l'inscription, puis formules Essentiel et Premium (Premium = IA illimitée, recettes et imports illimités, bilan, jeux complets), déclinées en Couple et Famille ; codes partenaires offrant des jours Premium. Ne jamais citer de prix ni de durée d'essai précise sauf si la consigne les donne.

TON DE MARQUE : chaleureux, direct, un peu malicieux (Waty), concret, jamais médical ni culpabilisant, zéro jargon, phrases courtes. Français impeccable. Pas d'emoji sauf demande explicite.
`.trim()
