import { useEffect, useState } from "react";
import { archetypes as compactArchetypes } from "./character-catalogue";

const preloadedArchetypes = (globalThis as typeof globalThis & { __PF1E_ARCHETYPES__?: typeof compactArchetypes }).__PF1E_ARCHETYPES__;
const initialArchetypes = preloadedArchetypes ?? compactArchetypes;

export function useArchetypeCatalogue(active: boolean) {
  const [archetypes, setArchetypes] = useState(initialArchetypes);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(Boolean(preloadedArchetypes));

  useEffect(() => {
    if (!active || loaded) return;
    let mounted = true;
    setLoading(true);
    void import("./archetype-catalogue")
      .then(({ fullArchetypeCatalogue }) => {
        if (mounted) {
          setArchetypes(fullArchetypeCatalogue);
          setLoaded(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [active, loaded]);

  return { archetypes, loading };
}
