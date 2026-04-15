import { useCallback, useEffect, useState } from 'react';

type UseResponsiveSidebarOptions = {
  phoneBreakpoint: number;
};

export const useResponsiveSidebar = ({ phoneBreakpoint }: UseResponsiveSidebarOptions) => {
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= phoneBreakpoint);

  useEffect(() => {
    const handleResize = () => {
      const isPhone = window.innerWidth <= phoneBreakpoint;
      setIsPhoneScreen(isPhone);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [phoneBreakpoint]);

  const toggleSidebar = useCallback(() => undefined, []);

  return {
    isPhoneScreen,
    toggleSidebar,
  };
};
