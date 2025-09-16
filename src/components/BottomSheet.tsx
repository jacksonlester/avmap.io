import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceArea, COMPANY_COLORS } from "@/types";
import { XIcon, ExternalLinkIcon } from "lucide-react";

interface BottomSheetProps {
  serviceArea: ServiceArea | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BottomSheet({ serviceArea, isOpen, onClose }: BottomSheetProps) {
  if (!isOpen || !serviceArea) return null;

  const companyConfig = COMPANY_COLORS[serviceArea.company];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-4 mb-4 md:mx-auto md:max-w-lg">
      <Card className="shadow-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: companyConfig.color }}
            />
            <CardTitle className="text-lg">{serviceArea.name}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Company:</span>
            <span className="font-medium">{serviceArea.company}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge 
              variant={serviceArea.status === 'Commercial' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {serviceArea.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Last Updated:</span>
            <span className="text-sm">{new Date(serviceArea.lastUpdated).toLocaleDateString()}</span>
          </div>
          
          <Button className="w-full" variant="outline">
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}