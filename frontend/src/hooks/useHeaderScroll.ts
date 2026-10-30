import { useEffect, useState } from "react";
import { useWindowScroll } from "./useWindowScroll";

export const useHeaderScroll = () => {
  const { y: currentScrollY } = useWindowScroll();
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    if (currentScrollY <= 10) {
      setIsNavVisible(true);
      setIsFloating(false);
    } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setIsNavVisible(false);
      setIsFloating(true);
    } else if (currentScrollY < lastScrollY) {
      setIsNavVisible(true);
      setIsFloating(true);
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY]);

  return {
    currentScrollY,
    lastScrollY,
    isNavVisible,
    isFloating,
  };
};

export default useHeaderScroll;
