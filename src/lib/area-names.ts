/** Chinese area names to English. Used when locale is EN. */
export const AREA_NAMES_EN: Record<string, string> = {
  "好友 SUP": "Friends SUP",
  "好友 $UP": "Friends $UP",
  "Sequel 说明卡": "Sequel Info Card",
  "SUP 引导卡": "SUP Guide Card",
  "$UP 引导卡": "$UP Guide Card",
  "创意卡": "Creative Card",
  "邀请好友卡": "Invite Friends Card",
  "普通创作者 $UP": "Regular Creator $UP",
};

export function areaToDisplay(area: string, locale: string): string {
  if (locale !== "en") return area;
  return AREA_NAMES_EN[area] ?? area;
}
