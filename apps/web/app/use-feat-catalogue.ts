import { useEffect, useState } from "react";
import { feats as compactFeats } from "./character-catalogue";

export function useFeatCatalogue(active: boolean) {
  const [feats, setFeats] = useState(compactFeats);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || feats.some((feat) => feat.benefit)) return;

    let mounted = true;
    setLoading(true);
    void import("./feat-catalogue")
      .then(({ fullFeatCatalogue }) => {
        if (mounted) setFeats(fullFeatCatalogue);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [active, feats]);

  return { feats, loading };
}
