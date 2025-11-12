export const LABEL_TO_GAME = {
  diamond: "/src/games/crossbow/index.html",
  heart: "/src/games/fingerpaint/index.html",
  baton: "/src/games/carpioche/index.html",
};

export function getRouteForLabel(label) {
  if (!label) return null;
  return LABEL_TO_GAME[String(label).toLowerCase()] || null;
}
