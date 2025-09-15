import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ServiceAreaShape } from '@/types/admin';
import { ServiceAreaShapeSchema } from '@/lib/adminSchemas';
import { computeBbox, computeAreaKm2 } from '@/lib/stateEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Upload } from 'lucide-react';

interface ServiceAreaShapeFormProps {
  shape?: ServiceAreaShape;
  deploymentId?: string;
  onSave: (data: ServiceAreaShape) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ServiceAreaShapeForm({ 
  shape, 
  deploymentId, 
  onSave, 
  onCancel, 
  loading 
}: ServiceAreaShapeFormProps) {
  const [geojsonText, setGeojsonText] = useState(
    shape?.geojson ? JSON.stringify(shape.geojson, null, 2) : ''
  );
  const [geojsonError, setGeojsonError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ServiceAreaShape>({
    resolver: zodResolver(ServiceAreaShapeSchema),
    defaultValues: shape || {
      id: '',
      deploymentId: deploymentId || '',
      validFrom: new Date().toISOString().split('T')[0],
      status: 'active',
      geojson: { type: 'FeatureCollection', features: [] }
    }
  });

  const validateAndSetGeojson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      
      if (parsed.type !== 'FeatureCollection') {
        throw new Error('GeoJSON must be a FeatureCollection');
      }
      
      if (!Array.isArray(parsed.features) || parsed.features.length === 0) {
        throw new Error('FeatureCollection must contain at least one feature');
      }

      // Compute bbox and area
      const bbox = computeBbox(parsed);
      const areaKm2 = computeAreaKm2(parsed);

      setValue('geojson', parsed);
      if (bbox) setValue('bbox', bbox as any);
      if (areaKm2) setValue('areaKm2', areaKm2);
      
      setGeojsonError(null);
      return true;
    } catch (error) {
      setGeojsonError(error instanceof Error ? error.message : 'Invalid GeoJSON');
      return false;
    }
  };

  const handleGeojsonChange = (text: string) => {
    setGeojsonText(text);
    if (text.trim()) {
      validateAndSetGeojson(text);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setGeojsonText(text);
      validateAndSetGeojson(text);
    };
    reader.readAsText(file);
  };

  const onSubmit = async (data: ServiceAreaShape) => {
    if (!validateAndSetGeojson(geojsonText)) {
      return;
    }
    await onSave(data);
  };

  const bbox = watch('bbox');
  const areaKm2 = watch('areaKm2');

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>
          {shape ? 'Edit Service Area Shape' : 'Create Service Area Shape'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Shape ID</Label>
              <Input
                id="id"
                {...register('id')}
                placeholder="waymo-sf-v1"
                disabled={!!shape}
              />
              {errors.id && (
                <p className="text-sm text-destructive">{errors.id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deploymentId">Deployment ID</Label>
              <Input
                id="deploymentId"
                {...register('deploymentId')}
                placeholder="waymo-sf"
                disabled={!!deploymentId}
              />
              {errors.deploymentId && (
                <p className="text-sm text-destructive">{errors.deploymentId.message}</p>
              )}
            </div>
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                {...register('validFrom')}
              />
              {errors.validFrom && (
                <p className="text-sm text-destructive">{errors.validFrom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To (optional)</Label>
              <Input
                id="validTo"
                type="date"
                {...register('validTo')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status') || 'active'}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* GeoJSON Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="geojson">GeoJSON Data</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('geojson-file')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <input
                  id="geojson-file"
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
            
            <Textarea
              id="geojson"
              value={geojsonText}
              onChange={(e) => handleGeojsonChange(e.target.value)}
              placeholder='{"type": "FeatureCollection", "features": [...]}'
              rows={12}
              className="font-mono text-sm"
            />
            
            {geojsonError && (
              <p className="text-sm text-destructive">{geojsonError}</p>
            )}
            
            {errors.geojson && (
              <p className="text-sm text-destructive">{String(errors.geojson.message)}</p>
            )}
          </div>

          {/* Computed Properties */}
          {(bbox || areaKm2) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Computed Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bbox && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Bounding Box:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      [{bbox.map(n => n.toFixed(4)).join(', ')}]
                    </Badge>
                  </div>
                )}
                {areaKm2 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Area:</span>
                    <Badge variant="outline">
                      ~{areaKm2.toFixed(1)} km²
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || !!geojsonError}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}