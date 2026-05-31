import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const ThemeToggle = () => {
  return (
    <AnimatedThemeToggler
      className="btn btn-secondary btn-round theme-toggle-btn"
      aria-label="Toggle theme"
      title="Toggle theme"
    />
  );
};

export default ThemeToggle;
