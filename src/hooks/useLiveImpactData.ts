import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, DbDonation, db } from "../lib/supabase";

export interface LiveImpactData {
  donations: DbDonation[];
  aggregatedTotals: Record<string, number>;
  loading: boolean;
}

export function useLiveImpactData(): LiveImpactData {
  const [donations, setDonations] = useState<DbDonation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Load initial donations from the DB helper
    const loadInitial = async () => {
      try {
        const list = await db.getDonations();
        if (active) {
          setDonations(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load initial donations:", err);
        if (active) setLoading(false);
      }
    };

    loadInitial();

    if (isSupabaseConfigured && supabase) {
      // Subscribing to any changes on the 'donations' table
      const channel = supabase
        .channel("public:donations_realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "donations" },
          async (payload) => {
            console.log("Realtime donation change received:", payload);
            
            // To ensure we get the full list (merging local updates if any are in localStorage)
            // we re-fetch from our DB utility.
            const freshList = await db.getDonations();
            if (active) {
              setDonations(freshList);
            }
          }
        )
        .subscribe();

      return () => {
        active = false;
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback/demo mode with polling when Supabase is not configured
      const interval = setInterval(async () => {
        const freshList = await db.getDonations();
        if (active) {
          setDonations(freshList);
        }
      }, 5000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }
  }, []);

  // Aggregating the total amounts per currency for successful donations
  const aggregatedTotals = donations
    .filter((d) => d.status === "success")
    .reduce<Record<string, number>>((acc, curr) => {
      acc[curr.currency] = (acc[curr.currency] || 0) + curr.amount;
      return acc;
    }, {});

  return {
    donations,
    aggregatedTotals,
    loading,
  };
}
