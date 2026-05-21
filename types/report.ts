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
  /** Когда зона отмечена убранной; null — активная заявка */
  cleaned_at?: string | null;
  /** Фото места после уборки */
  cleanup_photo_url?: string | null;
};

export type ReportsListScope = "active" | "completed";

export type NearbyReport = ReportRow & {
  distance_km: number;
};

/** Заявка в списке; расстояние — если передана геолокация */
export type ReportListItem = ReportRow & {
  distance_km?: number;
};
