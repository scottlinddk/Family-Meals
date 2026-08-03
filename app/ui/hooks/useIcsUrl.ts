import { useQuery } from "@tanstack/react-query";

interface FamilyResponse {
  id: string;
  name: string | null;
  calendarToken: string;
}

/** Resolves the family's stable webcal:// subscription URL for the ICS feed. */
export function useIcsUrl() {
  const query = useQuery({
    queryKey: ["family"],
    queryFn: async (): Promise<FamilyResponse> => {
      const res = await fetch("/api/family");
      if (!res.ok) throw new Error("Failed to load family");
      return res.json();
    },
  });

  const httpsUrl =
    query.data && typeof window !== "undefined"
      ? `${window.location.origin}/calendar/${query.data.calendarToken}.ics`
      : undefined;
  const webcalUrl = httpsUrl?.replace(/^https?:\/\//, "webcal://");

  return { ...query, httpsUrl, webcalUrl };
}
