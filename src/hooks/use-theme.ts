"use client";

import {
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";
import { useEffect, useState } from "react";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyResolved(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    const next = resolveTheme(stored, systemPrefersDark());
    setPreferenceState(stored);
    setResolved(next);
    applyResolved(next);
    setHydrated(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const pref = readStoredTheme();
      if (pref !== "system") return;
      const value = resolveTheme("system", mq.matches);
      setResolved(value);
      applyResolved(value);
    };
    mq.addEventListener("change", onChange);

    // Mantém o ícone alinhado se a classe .dark for aplicada por fora (prints / script).
    const syncFromDom = () => {
      const dark = document.documentElement.classList.contains("dark");
      setResolved(dark ? "dark" : "light");
      const pref = readStoredTheme();
      setPreferenceState(pref);
    };
    const obs = new MutationObserver(syncFromDom);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      mq.removeEventListener("change", onChange);
      obs.disconnect();
    };
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const value = resolveTheme(next, systemPrefersDark());
    setResolved(value);
    applyResolved(value);
  }

  function toggle() {
    setPreference(resolved === "dark" ? "light" : "dark");
  }

  return { preference, resolved, hydrated, setPreference, toggle };
}
