import { LocateIcon } from "@/components/icons/LocateIcon";

type LocateMeButtonProps = {
  onClick: () => void;
  loading?: boolean;
  className?: string;
};

export function LocateMeButton({
  onClick,
  loading = false,
  className = "",
}: LocateMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Показать моё местоположение"
      className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-steppe-deep shadow-lg shadow-steppe-deep/15 ring-1 ring-white/80 transition active:scale-95 disabled:opacity-60 ${className}`}
    >
      <LocateIcon
        className={`h-5 w-5 ${loading ? "animate-pulse" : ""}`}
      />
    </button>
  );
}
