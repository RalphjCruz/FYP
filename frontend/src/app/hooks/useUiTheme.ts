import { useCallback, useEffect, useState } from 'react';

type UseUiThemeOptions = {
  storageKey: string;
};

export const useUiTheme = ({ storageKey }: UseUiThemeOptions) => {
  const [isGameboyTheme, setIsGameboyTheme] = useState(() => window.localStorage.getItem(storageKey) === 'gameboy');

  useEffect(() => {
    if (isGameboyTheme) {
      document.body.classList.add('theme-gameboy');
      window.localStorage.setItem(storageKey, 'gameboy');
      return;
    }

    document.body.classList.remove('theme-gameboy');
    window.localStorage.setItem(storageKey, 'classic');
  }, [isGameboyTheme, storageKey]);

  const toggleTheme = useCallback(() => {
    setIsGameboyTheme((current) => !current);
  }, []);

  return {
    isGameboyTheme,
    toggleTheme,
  };
};
