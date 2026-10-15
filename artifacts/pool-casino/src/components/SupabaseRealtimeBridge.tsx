import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Refresh the API-backed pool query immediately when Supabase reports a
 * committed pool change. The table must be in supabase_realtime and have a
 * SELECT policy for the publishable/anon role.
 */
export function SupabaseRealtimeBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("poolcasino:pool")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pool" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/pool"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
