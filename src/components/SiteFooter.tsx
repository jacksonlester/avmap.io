import { Button } from "@/components/ui/button";
import { LegalNoticeModal } from "@/components/LegalNoticeModal";

export function SiteFooter() {
  return (
    <footer className="mt-auto py-3 px-4 border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto text-center">
        <p className="text-xs text-muted-foreground/80">
          Data provided as-is, without guarantees. See{" "}
          <LegalNoticeModal>
            <Button
              variant="link"
              className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 font-medium"
            >
              Legal Notice & Privacy Policy
            </Button>
          </LegalNoticeModal>
          .
        </p>
      </div>
    </footer>
  );
}