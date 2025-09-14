import React from 'react';
import { ServiceArea, COMPANY_COLORS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface OverlapBottomSheetProps {
  overlappingAreas: ServiceArea[];
  isOpen: boolean;
  onAreaSelect: (area: ServiceArea) => void;
  onClose: () => void;
}

export function OverlapBottomSheet({ 
  overlappingAreas, 
  isOpen, 
  onAreaSelect, 
  onClose 
}: OverlapBottomSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[50vh]">
        <SheetHeader>
          <SheetTitle>Multiple service areas here</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-4">
          {overlappingAreas.map((area) => {
            const companyConfig = COMPANY_COLORS[area.company];
            return (
              <button
                key={area.id}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left border",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                  "transition-colors duration-150"
                )}
                onClick={() => {
                  onAreaSelect(area);
                  onClose();
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: companyConfig.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium">
                    {area.company} – {area.name}
                  </div>
                  <Badge 
                    variant={area.status === 'Commercial' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {area.status}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}