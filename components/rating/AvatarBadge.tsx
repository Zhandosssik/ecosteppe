export function AvatarBadge({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-steppe-light/35 font-semibold text-steppe-deep ring-2 ring-white`}
    >
      {initial}
    </div>
  );
}
