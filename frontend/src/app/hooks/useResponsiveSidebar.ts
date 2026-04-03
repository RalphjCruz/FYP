import { useCallback, useEffect, useState } from 'react';

type UseResponsiveSidebarOptions = {
  phoneBreakpoint: number;
};

export const useResponsiveSidebar = ({ phoneBreakpoint }: UseResponsiveSidebarOptions) => {
  const [isPhoneScreen, setIsPhoneScreen] = useState(() => window.innerWidth <= phoneBreakpoint);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= phoneBreakpoint);

  useEffect(() => {
    const handleResize = () => {
      const isPhone = window.innerWidth <= phoneBreakpoint;
      setIsPhoneScreen(isPhone);

      if (isPhone) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [phoneBreakpoint]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((previous) => !previous);
  }, []);

  return {
    isPhoneScreen,
    isSidebarCollapsed,
    toggleSidebar,
  };
};
