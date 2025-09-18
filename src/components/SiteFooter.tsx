import { Button } from "@/components/ui/button";
import { LegalNoticeModal } from "@/components/LegalNoticeModal";

export function SiteFooter() {
  return (
    <footer className="mt-auto py-6 px-4 border-t border-border bg-background">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          Data provided as-is, without guarantees. See{" "}
          <LegalNoticeModal>
            <Button
              variant="link"
              className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground underline-offset-4"
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