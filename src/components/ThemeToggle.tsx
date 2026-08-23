import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Avoid hydration mismatch: the server can't know the stored theme.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative grid h-9 w-9 place-items-center rounded-md transition-all duration-100 hover:bg-secondary active:scale-95"
    >
      <Sun
        className={`h-5 w-5 transition-all duration-300 ${
          dark ? "absolute scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Moon
        className={`h-5 w-5 transition-all duration-300 ${
          dark ? "scale-100 rotate-0 opacity-100" : "absolute scale-0 rotate-90 opacity-0"
        }`}
      />
    </button>
  );
}
