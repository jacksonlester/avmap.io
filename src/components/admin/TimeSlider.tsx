import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Calendar } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

interface TimeSliderProps {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  currentDate: string;
  onDateChange: (date: string) => void;
  className?: string;
  showPlayback?: boolean;
}

export function TimeSlider({ 
  startDate, 
  endDate, 
  currentDate, 
  onDateChange, 
  className,
  showPlayback = true 
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms between steps

  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(currentDate);
  
  const totalDays = differenceInDays(end, start);
  const currentDays = differenceInDays(current, start);
  
  // Convert days to slider value (0-100)
  const sliderValue = totalDays > 0 ? (currentDays / totalDays) * 100 : 0;

  const handleSliderChange = useCallback((value: number[]) => {
    const newDays = Math.round((value[0] / 100) * totalDays);
    const newDate = addDays(start, newDays);
    onDateChange(newDate.toISOString().split('T')[0]);
  }, [start, totalDays, onDateChange]);

  const stepForward = useCallback(() => {
    const nextDay = addDays(current, 1);
    if (nextDay <= end) {
      onDateChange(nextDay.toISOString().split('T')[0]);
    } else {
      setIsPlaying(false);
    }
  }, [current, end, onDateChange]);

  const stepBackward = useCallback(() => {
    const prevDay = addDays(current, -1);
    if (prevDay >= start) {
      onDateChange(prevDay.toISOString().split('T')[0]);
    }
  }, [current, start, onDateChange]);

  const resetToStart = useCallback(() => {
    setIsPlaying(false);
    onDateChange(startDate);
  }, [startDate, onDateChange]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Playback effect
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      stepForward();
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, stepForward]);

  // Format dates for display
  const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Date Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatDate(current)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(start)} — {formatDate(end)}
            </div>
          </div>

          {/* Slider */}
          <div className="px-2">
            <Slider
              value={[sliderValue]}
              onValueChange={handleSliderChange}
              max={100}
              step={100 / totalDays}
              className="w-full"
            />
          </div>

          {/* Playback Controls */}
          {showPlayback && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToStart}
                  disabled={currentDays === 0}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stepBackward}
                  disabled={currentDays === 0}
                >
                  ←
                </Button>
                
                <Button
                  variant={isPlaying ? "default" : "outline"}
                  size="sm"
                  onClick={togglePlayback}
                  disabled={currentDays === totalDays}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stepForward}
                  disabled={currentDays === totalDays}
                >
                  →
                </Button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="text-xs bg-background border border-border rounded px-1 py-0.5"
                >
                  <option value={2000}>0.5x</option>
                  <option value={1000}>1x</option>
                  <option value={500}>2x</option>
                  <option value={250}>4x</option>
                </select>
              </div>
            </div>
          )}

          {/* Progress Info */}
          <div className="text-xs text-muted-foreground text-center">
            Day {currentDays + 1} of {totalDays + 1}
            {currentDays < totalDays && ` • ${totalDays - currentDays} days remaining`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}