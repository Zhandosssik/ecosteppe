/** Высота нижней навигации + safe-area (для позиционирования панели и кнопок карты) */
export const BOTTOM_NAV_CLASS =
  "h-[calc(3.75rem+env(safe-area-inset-bottom))]";

export const BOTTOM_NAV_OFFSET =
  "calc(3.75rem + env(safe-area-inset-bottom))";

/** Зазор FAB «Новая заявка» над центральной вкладкой навигации */
export const REPORTS_FAB_ABOVE_NAV = "2.25rem";

/** Нижний край FAB чуть выше кнопки «Заявки» в навбаре */
export const REPORTS_FAB_BOTTOM_OFFSET = `calc(${BOTTOM_NAV_OFFSET} + ${REPORTS_FAB_ABOVE_NAV})`;

/** Отступ списка заявок под FAB */
export const REPORTS_LIST_SCROLL_PADDING = `calc(${REPORTS_FAB_BOTTOM_OFFSET} + 4.25rem)`;

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
