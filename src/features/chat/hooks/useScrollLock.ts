import { useEffect } from 'react';

export function useScrollLock() {
  useEffect(() => {
    const lockScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
      }
    };

    window.addEventListener('scroll', lockScroll, { passive: true });
    
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTimeout(lockScroll, 30);
        setTimeout(lockScroll, 100);
        setTimeout(lockScroll, 250);
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('scroll', lockScroll);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);
}
