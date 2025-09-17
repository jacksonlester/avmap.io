import React from 'react';
import { ServiceArea, COMPANY_COLORS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OverlapPickerProps {
  overlappingAreas: ServiceArea[];
  position: { x: number; y: number };
  onAreaSelect: (area: ServiceArea) => void;
  onAreaHover: (area: ServiceArea | null) => void;
  className?: string;
}

export function OverlapPicker({ 
  overlappingAreas, 
  position, 
  onAreaSelect, 
  onAreaHover,
  className 
}: OverlapPickerProps) {
  return (
    <Card 
      className={cn(
        "absolute z-50 w-64 shadow-lg border bg-background/95 backdrop-blur-sm",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <CardContent className="p-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Multiple service areas here
          </h4>
          <div className="space-y-1">
            {overlappingAreas.map((area) => {
              const companyConfig = COMPANY_COLORS[area.company];
              return (
                <button
                  key={area.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md text-left",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    "transition-colors duration-150"
                  )}
                  onClick={() => onAreaSelect(area)}
                  onMouseEnter={() => onAreaHover(area)}
                  onMouseLeave={() => onAreaHover(null)}
                  onFocus={() => onAreaHover(area)}
                  onBlur={() => onAreaHover(null)}
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: companyConfig.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {area.company} – {area.name}
                    </div>
                    <Badge 
                      variant={area.status === 'Active' ? 'default' : 'secondary'}
                      className="text-xs mt-1"
                    >
                      {area.status}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}