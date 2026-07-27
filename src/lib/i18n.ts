// Lightweight localization keyed off ytgame.system.getLanguage().
//
// We intentionally ignore any previously stored language value — YouTube is
// the source of truth for the current viewer's locale. `useTranslations()`
// resolves the language on startup (async) and re-renders with the matching
// dictionary. Falls back to `navigator.language` and finally English.

import { useEffect, useState } from "react";
import { getLanguage } from "./ytPlayables";

type Dict = Record<string, string>;

const en: Dict = {
  "action.roll": "Roll",
  "action.playAgain": "Play Again",
  "action.undo": "Undo last move",
  "action.redo": "Redo",
  "action.rules": "Rules",
  "action.history": "Toggle history",
  "action.mute": "Mute sounds",
  "action.unmute": "Enable sounds",
  "reward.button": "🎁 Free reroll (ad)",
  "reward.granted": "Reward unlocked: your next roll is a 6!",
  "reward.failed": "Ad not completed — no reward.",
  "reward.dismissed": "Ad skipped — no reward. Try again?",
  "reward.error": "Ad failed to load. Retry?",
  "reward.timeout": "Ad timed out. Retry?",
  "reward.retry": "Retry ad",
  "reward.loading": "Loading ad…",
  "action.debug": "Debug panel",
};

const dicts: Record<string, Dict> = {
  en,
  es: {
    ...en,
    "action.roll": "Tirar",
    "action.playAgain": "Jugar de nuevo",
    "action.undo": "Deshacer",
    "action.redo": "Rehacer",
    "action.rules": "Reglas",
    "action.history": "Historial",
    "action.mute": "Silenciar",
    "action.unmute": "Activar sonido",
    "reward.button": "🎁 Tirada gratis (anuncio)",
    "reward.granted": "¡Recompensa! Tu próxima tirada será un 6.",
    "reward.failed": "Anuncio no completado.",
  },
  pt: {
    ...en,
    "action.roll": "Rolar",
    "action.playAgain": "Jogar novamente",
    "reward.button": "🎁 Rolagem grátis (anúncio)",
    "reward.granted": "Recompensa! Sua próxima rolagem será 6.",
  },
  fr: {
    ...en,
    "action.roll": "Lancer",
    "action.playAgain": "Rejouer",
    "reward.button": "🎁 Relance gratuite (pub)",
    "reward.granted": "Récompense ! Votre prochain lancer sera un 6.",
  },
  de: {
    ...en,
    "action.roll": "Würfeln",
    "action.playAgain": "Nochmal spielen",
    "reward.button": "🎁 Gratis-Wurf (Werbung)",
    "reward.granted": "Belohnung! Dein nächster Wurf ist eine 6.",
  },
  hi: {
    ...en,
    "action.roll": "पासा फेंको",
    "action.playAgain": "फिर से खेलें",
    "reward.button": "🎁 मुफ़्त रीरोल (विज्ञापन)",
    "reward.granted": "इनाम! अगला पासा 6 आएगा।",
  },
};

function resolveDict(lang: string | null): Dict {
  if (!lang) return en;
  const base = lang.toLowerCase().split(/[-_]/)[0];
  return dicts[base] ?? en;
}

let cached: { lang: string; dict: Dict } | null = null;

export async function loadLanguage(): Promise<{ lang: string; dict: Dict }> {
  if (cached) return cached;
  let lang = await getLanguage();
  if (!lang && typeof navigator !== "undefined") lang = navigator.language;
  cached = { lang: lang ?? "en", dict: resolveDict(lang) };
  return cached;
}

export function useTranslations() {
  const [state, setState] = useState<{ lang: string; dict: Dict }>(
    cached ?? { lang: "en", dict: en }
  );
  useEffect(() => {
    let alive = true;
    loadLanguage().then((r) => {
      if (alive) setState(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  const t = (key: string) => state.dict[key] ?? en[key] ?? key;
  return { t, lang: state.lang };
}