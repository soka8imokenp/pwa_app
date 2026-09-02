export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'kairo_theme_mode';

/**
 * Get stored theme mode preference, defaulting to 'system'
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

/**
 * Resolves the effective theme ('light' or 'dark') taking OS preference into account
 */
export function getEffectiveTheme(mode?: ThemeMode): 'light' | 'dark' {
  const currentMode = mode || getStoredThemeMode();
  if (currentMode === 'light') return 'light';
  if (currentMode === 'dark') return 'dark';

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Check if the active theme is currently dark
 */
export function isDarkMode(): boolean {
  return getEffectiveTheme() === 'dark';
}

/**
 * Apply the theme class to <html> / <body> and update PWA meta theme-color
 */
export function applyTheme(mode?: ThemeMode): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const currentMode = mode || getStoredThemeMode();
  const effectiveTheme = getEffectiveTheme(currentMode);
  const isDark = effectiveTheme === 'dark';

  // Toggle .dark class on root element and body
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }

  // Update native PWA status bar meta theme-color
  const themeColor = isDark ? '#0E1612' : '#F4F0EA';
  const metaThemeColors = document.querySelectorAll('meta[name="theme-color"]');
  metaThemeColors.forEach((meta) => {
    meta.setAttribute('content', themeColor);
  });

  // Dispatch custom event for components
  window.dispatchEvent(
    new CustomEvent('sumire:theme-changed', {
      detail: { mode: currentMode, effectiveTheme, isDark },
    })
  );
}

/**
 * Set and persist theme mode preference
 */
export function setThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
}

/**
 * Quick toggle between light and dark modes
 */
export function toggleTheme(): 'light' | 'dark' {
  const current = getEffectiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setThemeMode(next);
  return next;
}

/**
 * Initialize theme and listen for system dark mode changes
 */
export function initThemeService(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Apply initial theme
  applyTheme();

  // Listen for system theme preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (getStoredThemeMode() === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else {
    mediaQuery.addListener(handleSystemChange);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemChange);
    } else {
      mediaQuery.removeListener(handleSystemChange);
    }
  };
}
