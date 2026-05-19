export type ReportStatus = "pending" | "verified" | "rejected";

export type ReportRow = {
  id: string;
  user_id: string | null;
  lat: number;
  lng: number;
  photo_url: string | null;
  ai_verified: boolean;
  ai_confidence: number | null;
  status: ReportStatus;
  notes: string | null;
  created_at: string;
};

export type NearbyReport = ReportRow & {
  distance_km: number;
};
