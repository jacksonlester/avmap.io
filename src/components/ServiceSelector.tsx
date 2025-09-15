import { ServiceArea, COMPANY_COLORS } from '@/types';

interface ServiceSelectorProps {
  areas: ServiceArea[];
  onSelect: (area: ServiceArea) => void;
}

export function ServiceSelector({ areas, onSelect }: ServiceSelectorProps) {
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg min-w-48 max-w-64">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">
          Select Service ({areas.length})
        </h3>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {areas.map((area) => {
          const companyConfig = COMPANY_COLORS[area.company];
          return (
            <button
              key={area.id}
              onClick={() => onSelect(area)}
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-b-0 border-border/50"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: companyConfig.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">
                    {area.company}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {area.name}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}