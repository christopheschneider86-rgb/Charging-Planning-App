import { useEffect } from 'react';

// Locks background scrolling while `active` is true. Restores the previous
// scroll position when the modal closes — critical on iOS, where adding
// position:fixed alone would otherwise jump the page to the top.
export const useBodyScrollLock = (active) => {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [active]);
};
