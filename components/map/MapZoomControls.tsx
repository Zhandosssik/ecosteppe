import { MinusIcon } from "@/components/icons/MinusIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";

type MapZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const btnClass =
  "flex h-11 w-11 items-center justify-center bg-white text-steppe-deep transition active:bg-sand active:scale-95";

export function MapZoomControls({
  onZoomIn,
  onZoomOut,
}: MapZoomControlsProps) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl shadow-lg shadow-steppe-deep/15 ring-1 ring-white/80"
      role="group"
      aria-label="Масштаб карты"
    >
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Приблизить"
        className={`${btnClass} border-b border-sand-dark/50`}
      >
        <PlusIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Отдалить"
        className={btnClass}
      >
        <MinusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
