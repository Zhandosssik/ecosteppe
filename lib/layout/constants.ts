/** Высота нижней навигации + safe-area (для позиционирования панели и кнопок карты) */
export const BOTTOM_NAV_CLASS =
  "h-[calc(3.75rem+env(safe-area-inset-bottom))]";

export const BOTTOM_NAV_OFFSET =
  "calc(3.75rem + env(safe-area-inset-bottom))";

/** Список зон: карта 52% / панель 48% */
export const MAP_LIST_SPLIT_HEIGHT = "52%";
export const LIST_PANEL_SPLIT_HEIGHT = "48%";

/** Детали зоны: карта 67% / панель 33% */
export const MAP_DETAIL_SPLIT_HEIGHT = "67%";
export const DETAIL_PANEL_SPLIT_HEIGHT = "33%";

/** Высота панели деталей (экран) */
export const DETAIL_PANEL_HEIGHT = "33dvh";

/** Фото: 33% от панели деталей (~11% экрана). Альтернатива: 22dvh (22% экрана) */
export const DETAIL_PHOTO_HEIGHT = "calc(33dvh * 0.33)";

export const DETAIL_PANEL_PEEK = "3.25rem";
