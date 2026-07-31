import { useEffect, useState } from "react";
import { spells as compactSpells } from "./character-catalogue";

export function useSpellCatalogue(active: boolean) {
  const [spells, setSpells] = useState(compactSpells);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || spells.some((spell) => spell.description)) return;
    let mounted = true;
    setLoading(true);
    void import("./spell-catalogue")
      .then(({ fullSpellCatalogue }) => { if (mounted) setSpells(fullSpellCatalogue); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [active, spells]);

  return { spells, loading };
}
