const SPORT_THUMBNAIL_DIR = "/images/sports/thumbnails";
const SPORT_ICON_DIR = "/images/sports/icons";

const SPORT_VISUAL_FILES = {
  "\ucd95\uad6c": "soccer",
  "\ud48b\uc0b4": "futsal",
  "\ub18d\uad6c": "basketball",
  "\ubc30\uad6c": "volleyball",
  "\uc57c\uad6c": "baseball",
  "\uc871\uad6c": "jokgu",
  "\ubc30\ub4dc\ubbfc\ud134": "badminton",
  "\ud0c1\uad6c": "table-tennis",
  "\ud14c\ub2c8\uc2a4": "tennis",
  "\uc2a4\ucffc\uc2dc": "squash",
  "\ub7ec\ub2dd": "running",
  "\ub4f1\uc0b0": "hiking",
  "\ud2b8\ub808\ud0b9": "trekking",
  "\ud2b8\ub798\ud0b9": "trekking",
  "\uc790\uc804\uac70": "cycling",
  "\ub77c\uc774\ub529": "cycling",
  "\uc0b0\ucc45": "walking",
  "\uc6cc\ud0b9": "walking",
  "\uac77\uae30": "walking",
  "\ud5ec\uc2a4": "fitness",
  "\ud53c\ud2b8\ub2c8\uc2a4": "fitness",
  "\ud06c\ub85c\uc2a4\ud54f": "crossfit",
  "\ud074\ub77c\uc774\ubc0d": "climbing",
  "\uc694\uac00": "yoga",
  "\ud544\ub77c\ud14c\uc2a4": "pilates",
  "\ubcfc\ub9c1": "bowling",
  "\ub2f9\uad6c": "billiards",
  "\uace8\ud504": "golf",
  "\uc218\uc601": "swimming",
};

export const HOME_SPORT_SHORTCUT_LABELS = [
  "\ub18d\uad6c",
  "\ucd95\uad6c",
  "\ub7ec\ub2dd",
  "\ud5ec\uc2a4",
  "\ub4f1\uc0b0",
  "\uc790\uc804\uac70",
];

export function getSportAssetKey(sportName) {
  const normalizedName = String(sportName || "").trim();
  if (!normalizedName) return "";

  const exactKey = SPORT_VISUAL_FILES[normalizedName];
  if (exactKey) return exactKey;

  const matchedEntry = Object.entries(SPORT_VISUAL_FILES).find(([name]) =>
    normalizedName.includes(name)
  );

  return matchedEntry?.[1] || "";
}

export function getSportVisualAsset(sportName) {
  const key = getSportAssetKey(sportName);
  return {
    key,
    thumbnail: key ? `${SPORT_THUMBNAIL_DIR}/${key}.png` : "",
    icon: key ? `${SPORT_ICON_DIR}/${key}.svg` : "",
  };
}
