import { ServiceArea, COMPANY_COLORS } from '@/types';

interface ServiceSelectorProps {
  areas: ServiceArea[];
  onSelect: (area: ServiceArea) => void;
}

export function ServiceSelector({ areas, onSelect }: ServiceSelectorProps) {
  return (
    <div className="bg-black/90 backdrop-blur-md rounded-lg shadow-xl min-w-48 max-w-64">
      <div className="p-3 border-b border-white/20">
        <h3 className="text-sm font-medium text-white">
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
              className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors border-b last:border-b-0 border-white/10"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: companyConfig.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {area.company}
                  </div>
                  <div className="text-xs text-white/70 truncate">
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