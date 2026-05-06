import { useEffect, useState } from "react";

// Fixed gradient at the bottom of the viewport that makes content feel like
// it's emerging from below. Hides itself once the user has scrolled to the
// actual end of the page.
export function ScrollFade() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      // A small buffer — treat "nearly at bottom" as bottom.
      const atBottom = total - scrolled < 32;
      setVisible(!atBottom);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="viewport-fade-bottom"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
