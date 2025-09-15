import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Event, 
  EVENT_TYPES, 
  RIDER_APPS, 
  SERVICE_ACCESS_OPTIONS, 
  AUTONOMY_MODE_OPTIONS 
} from '@/types/admin';
import { EventSchema } from '@/lib/adminSchemas';
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
import { X } from 'lucide-react';

interface EventFormProps {
  event?: Event;
  deploymentId?: string;
  onSave: (data: Event) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function EventForm({ event, deploymentId, onSave, onCancel, loading }: EventFormProps) {
  const [eventType, setEventType] = useState(event?.type || '');
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<Event>({
    resolver: zodResolver(EventSchema),
    defaultValues: event || {
      id: '',
      deploymentId: deploymentId || '',
      date: new Date().toISOString().split('T')[0],
      type: 'testing_start' as any,
      details: {}
    }
  });

  const watchedDetails = watch('details') || {};

  // Handle event type specific details
  const updateEventDetails = (field: string, value: any) => {
    const currentDetails = watchedDetails;
    setValue('details', { ...currentDetails, [field]: value });
  };

  const toggleRiderApp = (app: string, action: 'add' | 'remove') => {
    const currentDetails = watchedDetails;
    const currentList = currentDetails[action] || [];
    const updated = currentList.includes(app)
      ? currentList.filter((a: string) => a !== app)
      : [...currentList, app];
    
    updateEventDetails(action, updated);
  };

  const onSubmit = async (data: Event) => {
    await onSave(data);
  };

  const renderEventTypeSpecificFields = () => {
    switch (eventType) {
      case 'service_access_update':
        return (
          <div className="space-y-2">
            <Label>New Access Level</Label>
            <Select
              value={watchedDetails.access || ''}
              onValueChange={(value) => updateEventDetails('access', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_ACCESS_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'autonomy_update':
        return (
          <div className="space-y-2">
            <Label>New Autonomy Mode</Label>
            <Select
              value={watchedDetails.autonomy || ''}
              onValueChange={(value) => updateEventDetails('autonomy', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select autonomy mode" />
              </SelectTrigger>
              <SelectContent>
                {AUTONOMY_MODE_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'rider_app_update':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Apps</Label>
              <div className="flex flex-wrap gap-2">
                {RIDER_APPS.map(app => (
                  <Button
                    key={app}
                    type="button"
                    variant={(watchedDetails.add || []).includes(app) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRiderApp(app, 'add')}
                  >
                    {app}
                    {(watchedDetails.add || []).includes(app) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                ))}
              </div>
              {(watchedDetails.add || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(watchedDetails.add || []).map((app: string) => (
                    <Badge key={app} variant="secondary">
                      +{app}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Remove Apps</Label>
              <div className="flex flex-wrap gap-2">
                {RIDER_APPS.map(app => (
                  <Button
                    key={app}
                    type="button"
                    variant={(watchedDetails.remove || []).includes(app) ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleRiderApp(app, 'remove')}
                  >
                    {app}
                    {(watchedDetails.remove || []).includes(app) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                ))}
              </div>
              {(watchedDetails.remove || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(watchedDetails.remove || []).map((app: string) => (
                    <Badge key={app} variant="destructive">
                      -{app}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'boundary_update':
        return (
          <div className="space-y-2">
            <Label htmlFor="shapeId">Shape ID</Label>
            <Input
              id="shapeId"
              {...register('shapeId')}
              placeholder="waymo-sf-v2"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {event ? 'Edit Event' : 'Create Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Event ID</Label>
              <Input
                id="id"
                {...register('id')}
                placeholder="waymo-sf-launch"
                disabled={!!event}
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

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select
              value={watch('type')}
              onValueChange={(value) => {
                setValue('type', value as any);
                setEventType(value);
                setValue('details', {}); // Reset details when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Event Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective From (optional)</Label>
              <Input
                id="effectiveFrom"
                type="date"
                {...register('effectiveFrom')}
              />
            </div>
          </div>

          {/* Event Type Specific Fields */}
          {renderEventTypeSpecificFields()}

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              type="url"
              {...register('sourceUrl')}
              placeholder="https://example.com/press-release"
            />
            {errors.sourceUrl && (
              <p className="text-sm text-destructive">{errors.sourceUrl.message}</p>
            )}
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