import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoonIcon, SunIcon, MenuIcon, FilterIcon, X } from "lucide-react";
import { useTheme } from "next-themes";
import { LegalNoticeModal } from "@/components/LegalNoticeModal";

interface HeaderProps {
  onToggleFilters?: () => void;
  isMobile?: boolean;
  showFilters?: boolean;
}

export function Header({ onToggleFilters, isMobile = false, showFilters = false }: HeaderProps = {}) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: "/", label: "Map" },
    { to: "/about", label: "About" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Force a full page reload to reset everything
    window.location.href = "/";
  };

  return (
    <header id="app-header" className="fixed top-0 inset-x-0 z-50 border-b bg-background">
      <div className="w-full box-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 shrink-0">
          <a href="/" onClick={handleLogoClick} className="flex items-center space-x-2 cursor-pointer">
            <img src="/logo.png" alt="AV Map Logo" className="h-6 w-6" />
            <span className="font-bold text-lg">AV Map</span>
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium shrink-0">
            <Link to="/about" className="text-foreground/60 hover:text-foreground transition-colors">
              About
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">

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
                
                {/* Legal notice in mobile menu */}
                <div className="border-t pt-4 mt-4">
                  <LegalNoticeModal>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Legal Notice & Privacy Policy
                    </Button>
                  </LegalNoticeModal>
                </div>

                {/* Theme toggle in mobile menu */}
                <div className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="relative w-full justify-start text-xs"
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
            className="relative hidden md:flex"
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