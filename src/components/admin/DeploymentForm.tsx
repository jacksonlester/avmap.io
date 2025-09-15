import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Deployment, 
  OPERATORS, 
  RIDER_APPS, 
  SERVICE_ACCESS_OPTIONS, 
  AUTONOMY_MODE_OPTIONS 
} from '@/types/admin';
import { DeploymentSchema } from '@/lib/adminSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { X } from 'lucide-react';

interface DeploymentFormProps {
  deployment?: Deployment;
  onSave: (data: Deployment) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function DeploymentForm({ deployment, onSave, onCancel, loading }: DeploymentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<Deployment>({
    resolver: zodResolver(DeploymentSchema),
    defaultValues: deployment || {
      id: '',
      operator: '',
      city: '',
      riderAppsCurrent: []
    }
  });

  const watchedRiderApps = watch('riderAppsCurrent') || [];

  const toggleRiderApp = (app: string) => {
    const current = watchedRiderApps;
    const updated = current.includes(app as any)
      ? current.filter(a => a !== app)
      : [...current, app as any];
    setValue('riderAppsCurrent', updated as any);
  };

  const onSubmit = async (data: Deployment) => {
    await onSave(data);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {deployment ? 'Edit Deployment' : 'Create Deployment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">ID (slug)</Label>
              <Input
                id="id"
                {...register('id')}
                placeholder="waymo-sf"
                disabled={!!deployment}
              />
              {errors.id && (
                <p className="text-sm text-destructive">{errors.id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="San Francisco"
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>
          </div>

          {/* Operator */}
          <div className="space-y-2">
            <Label htmlFor="operator">Autonomy Operator</Label>
            <Select
              value={watch('operator')}
              onValueChange={(value) => setValue('operator', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(operator => (
                  <SelectItem key={operator} value={operator}>
                    {operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.operator && (
              <p className="text-sm text-destructive">{errors.operator.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startedOn">Started On</Label>
              <Input
                id="startedOn"
                type="date"
                {...register('startedOn')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endedOn">Ended On</Label>
              <Input
                id="endedOn"
                type="date"
                {...register('endedOn')}
              />
            </div>
          </div>

          {/* Current State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accessCurrent">Current Access Level</Label>
              <Select
                value={watch('accessCurrent') || ''}
                onValueChange={(value) => setValue('accessCurrent', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {SERVICE_ACCESS_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="autonomyCurrent">Current Autonomy Mode</Label>
              <Select
                value={watch('autonomyCurrent') || ''}
                onValueChange={(value) => setValue('autonomyCurrent', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select autonomy mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {AUTONOMY_MODE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rider Apps */}
          <div className="space-y-2">
            <Label>Current Rider Apps</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {RIDER_APPS.map(app => (
                  <Button
                    key={app}
                    type="button"
                    variant={watchedRiderApps.includes(app as any) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRiderApp(app)}
                  >
                    {app}
                    {watchedRiderApps.includes(app as any) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                ))}
              </div>
              {watchedRiderApps.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {watchedRiderApps.map(app => (
                    <Badge key={app} variant="secondary">
                      {app}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Merged Into */}
          <div className="space-y-2">
            <Label htmlFor="mergedInto">Merged Into (deployment ID)</Label>
            <Input
              id="mergedInto"
              {...register('mergedInto')}
              placeholder="waymo-sf-expanded"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
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