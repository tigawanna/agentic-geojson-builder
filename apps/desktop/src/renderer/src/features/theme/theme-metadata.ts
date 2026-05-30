export type ThemeColorScheme = "light" | "dark";

export type ThemeMeta = {
  name: string;
  colorScheme: ThemeColorScheme;
};

export const LIGHT_THEMES: ThemeMeta[] = [
  { name: "light", colorScheme: "light" },
  { name: "cupcake", colorScheme: "light" },
  { name: "bumblebee", colorScheme: "light" },
  { name: "emerald", colorScheme: "light" },
  { name: "corporate", colorScheme: "light" },
  { name: "retro", colorScheme: "light" },
  { name: "cyberpunk", colorScheme: "light" },
  { name: "valentine", colorScheme: "light" },
  { name: "garden", colorScheme: "light" },
  { name: "aqua", colorScheme: "light" },
  { name: "lofi", colorScheme: "light" },
  { name: "pastel", colorScheme: "light" },
  { name: "fantasy", colorScheme: "light" },
  { name: "wireframe", colorScheme: "light" },
  { name: "cmyk", colorScheme: "light" },
  { name: "autumn", colorScheme: "light" },
  { name: "acid", colorScheme: "light" },
  { name: "lemonade", colorScheme: "light" },
  { name: "winter", colorScheme: "light" },
  { name: "nord", colorScheme: "light" },
  { name: "caramellatte", colorScheme: "light" },
  { name: "silk", colorScheme: "light" },
];

export const DARK_THEMES: ThemeMeta[] = [
  { name: "dark", colorScheme: "dark" },
  { name: "synthwave", colorScheme: "dark" },
  { name: "halloween", colorScheme: "dark" },
  { name: "forest", colorScheme: "dark" },
  { name: "black", colorScheme: "dark" },
  { name: "luxury", colorScheme: "dark" },
  { name: "dracula", colorScheme: "dark" },
  { name: "business", colorScheme: "dark" },
  { name: "night", colorScheme: "dark" },
  { name: "coffee", colorScheme: "dark" },
  { name: "dim", colorScheme: "dark" },
  { name: "sunset", colorScheme: "dark" },
  { name: "abyss", colorScheme: "dark" },
];

export const ALL_THEMES: ThemeMeta[] = [...LIGHT_THEMES, ...DARK_THEMES];

export function getThemeColorScheme(name: string): ThemeColorScheme {
  const found = ALL_THEMES.find((t) => t.name === name);
  return found?.colorScheme ?? "dark";
}
