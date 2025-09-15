import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoonIcon, SunIcon, MenuIcon, FilterIcon, X } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  onToggleFilters?: () => void;
  isMobile?: boolean;
  showFilters?: boolean;
}

export function Header({ onToggleFilters, isMobile, showFilters }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Map" },
    { to: "/companies", label: "Companies" },
    { to: "/cities", label: "Cities" },
    { to: "/news", label: "News" },
    { to: "/about", label: "About" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary"></div>
            <span className="font-bold text-lg">AV Map</span>
          </Link>
          
          {/* Desktop Navigation */}
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
          {/* Mobile Filter Toggle - only show on map page */}
          {isMobile && location.pathname === "/" && (
            <Button 
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={onToggleFilters}
              className="md:hidden"
            >
              {showFilters ? <X className="h-4 w-4" /> : <FilterIcon className="h-4 w-4" />}
              <span className="sr-only">
                {showFilters ? "Close filters" : "Open filters"}
              </span>
            </Button>
          )}

          {/* Mobile Navigation Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="md:hidden"
              >
                <MenuIcon className="h-4 w-4" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`text-left px-4 py-2 rounded-md transition-colors ${
                      isActive(item.to)
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground/60 hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Theme toggle in mobile menu */}
                <div className="border-t pt-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-full justify-start"
                  >
                    <SunIcon className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <MoonIcon className="h-4 w-4 mr-2 absolute ml-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="ml-6">
                      {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    </span>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          
          {/* Desktop Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="hidden md:flex mr-4"
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