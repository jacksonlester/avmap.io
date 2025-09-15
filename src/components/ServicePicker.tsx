import { useEffect, useRef } from "react";
import { useFloating, flip, shift, offset, autoUpdate } from "@floating-ui/react";
import { ServiceArea, COMPANY_COLORS } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ServicePickerProps {
  map: mapboxgl.Map;
  lngLat: mapboxgl.LngLat;
  options: ServiceArea[];
  onSelect: (area: ServiceArea) => void;
  onClose: () => void;
}

export function ServicePicker({ map, lngLat, options, onSelect, onClose }: ServicePickerProps) {
  const container = document.getElementById("map-container") as HTMLElement;
  const ref = useRef<HTMLDivElement | null>(null);

  // Convert map lngLat -> screen point for anchoring
  const pt = map.project(lngLat);
  const virtualEl = {
    getBoundingClientRect: () => new DOMRect(pt.x, pt.y, 0, 0),
  } as any;

  const { refs, floatingStyles, update, middlewareData } = useFloating({
    strategy: "fixed",
    placement: "top-start",
    elements: { reference: virtualEl },
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8, boundary: container }),
    ],
  });

  useEffect(() => {
    if (!container) return;
    return autoUpdate(virtualEl, ref.current!, update);
  }, [container, update]);

  // If we still overflow (near edges), gently pan the map to create room.
  useEffect(() => {
    const o = middlewareData.shift;
    if (!o) return;
    // middlewareData.shift reports how much it had to shove the popup;
    // if that shove hits the limit, we pan the map slightly.
    const MAX_NUDGE = 40; // px
    const dx = Math.max(-MAX_NUDGE, Math.min(MAX_NUDGE, (o.x ?? 0)));
    const dy = Math.max(-MAX_NUDGE, Math.min(MAX_NUDGE, (o.y ?? 0)));
    if (dx !== 0 || dy !== 0) map.panBy([-dx, -dy], { duration: 150 });
  }, [middlewareData.shift]);

  // Reposition as map moves/zooms
  useEffect(() => {
    const sync = () => update();
    map.on("move", sync);
    return () => {
      map.off("move", sync);
    };
  }, [map, update]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, pointerEvents: "auto", zIndex: 70 }}
        className="rounded-lg border border-white/10 bg-[#0b1020] text-white shadow-lg p-3 min-w-[200px]"
      >
        <div className="text-sm font-medium mb-2 text-white/80">Select service area:</div>
        <div className="space-y-2">
          {options.map((area) => {
            const companyConfig = COMPANY_COLORS[area.company];
            return (
              <button
                key={area.id}
                onClick={() => onSelect(area)}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors text-left"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: companyConfig.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {area.company}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {area.name}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                  {area.status}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}