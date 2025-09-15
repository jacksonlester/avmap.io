import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MapFilters, COMPANY_COLORS } from "@/types";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FiltersProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

const COMPANIES = Object.keys(COMPANY_COLORS);
const STATUSES = ['Commercial', 'Testing', 'Pilot'];

export function Filters({ filters, onFiltersChange, onClose, isMobile }: FiltersProps) {
  const handleCompanyChange = (company: string, checked: boolean) => {
    const newCompanies = checked 
      ? [...filters.companies, company]
      : filters.companies.filter(c => c !== company);
    
    onFiltersChange({ ...filters, companies: newCompanies });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.statuses, status] 
      : filters.statuses.filter(s => s !== status);
      
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  return (
    <div className={`${isMobile ? 'bg-background border rounded-lg shadow-lg p-4' : ''}`}>
      {isMobile && (
        <div className="flex flex-row items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Filters</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">Companies</h3>
          <div className="space-y-2">
            {COMPANIES.map((company) => (
              <div key={company} className="flex items-center space-x-2">
                <Checkbox
                  id={`company-${company}`}
                  checked={filters.companies.includes(company)}
                  onCheckedChange={(checked) => 
                    handleCompanyChange(company, checked as boolean)
                  }
                />
                <label 
                  htmlFor={`company-${company}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COMPANY_COLORS[company].color }}
                  />
                  {company}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Status</h3>
          <div className="space-y-2">
            {STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={(checked) => 
                    handleStatusChange(status, checked as boolean)
                  }
                />
                <label 
                  htmlFor={`status-${status}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {status}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}