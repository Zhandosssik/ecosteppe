import {
  dataUrlToFile,
  getOfflineReportQueue,
  removeOfflineReport,
} from "@/lib/profile/offline-queue";
import { submitReport } from "@/lib/reports/submit-report";

export type SyncOfflineResult = {
  sent: number;
  failed: number;
  errors: string[];
};

export async function syncOfflineReportQueue(): Promise<SyncOfflineResult> {
  const queue = getOfflineReportQueue();
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of queue) {
    try {
      const file = dataUrlToFile(item.photoDataUrl, item.id);
      const result = await submitReport({
        photo: file,
        lat: item.lat,
        lng: item.lng,
        notes: item.notes,
      });

      if (result.ok) {
        removeOfflineReport(item.id);
        sent += 1;
      } else if (!result.rejected) {
        failed += 1;
        errors.push(result.message);
      } else {
        removeOfflineReport(item.id);
        failed += 1;
        errors.push(result.message);
      }
    } catch {
      failed += 1;
      errors.push("Нет связи с сервером");
      break;
    }
  }

  return { sent, failed, errors };
}
