import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon, MenuIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  onToggleFilters?: () => void;
  isMobile?: boolean;
}

export function Header({ onToggleFilters, isMobile }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary"></div>
            <span className="font-bold text-lg">AV Map</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="/companies" className="text-foreground/60 hover:text-foreground transition-colors">
              Companies
            </Link>
            <Link to="/cities" className="text-foreground/60 hover:text-foreground transition-colors">
              Cities
            </Link>
            <Link to="/news" className="text-foreground/60 hover:text-foreground transition-colors">
              News
            </Link>
            <Link to="/about" className="text-foreground/60 hover:text-foreground transition-colors">
              About
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onToggleFilters}
              className="md:hidden"
            >
              <MenuIcon className="h-4 w-4" />
              <span className="sr-only">Toggle filters</span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}