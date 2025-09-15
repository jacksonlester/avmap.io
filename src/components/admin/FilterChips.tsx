import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { OPERATORS, RIDER_APPS, OPERATOR_COLORS } from '@/types/admin';

interface FilterChipsProps {
  selectedOperators: string[];
  selectedApps: string[];
  onOperatorToggle: (operator: string) => void;
  onAppToggle: (app: string) => void;
  className?: string;
}

export function FilterChips({ 
  selectedOperators, 
  selectedApps, 
  onOperatorToggle, 
  onAppToggle,
  className 
}: FilterChipsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Operators */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Operators</h4>
        <div className="flex flex-wrap gap-2">
          {OPERATORS.map(operator => {
            const isSelected = selectedOperators.includes(operator);
            return (
              <Button
                key={operator}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onOperatorToggle(operator)}
                className="h-8"
              >
                <div 
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ 
                    backgroundColor: OPERATOR_COLORS[operator] || '#6C757D' 
                  }}
                />
                {operator}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Button>
            );
          })}
        </div>
        {selectedOperators.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedOperators.map(operator => (
              <Badge key={operator} variant="secondary" className="text-xs">
                {operator}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Apps */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Rider Apps</h4>
        <div className="flex flex-wrap gap-2">
          {RIDER_APPS.map(app => {
            const isSelected = selectedApps.includes(app);
            return (
              <Button
                key={app}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onAppToggle(app)}
                className="h-8"
              >
                {app}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Button>
            );
          })}
        </div>
        {selectedApps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedApps.map(app => (
              <Badge key={app} variant="secondary" className="text-xs">
                {app}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}