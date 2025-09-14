import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StoryType } from "@/types/news";

interface TagProps {
  children: React.ReactNode;
  variant?: "type" | "company" | "tag";
  className?: string;
}

export function Tag({ children, variant = "tag", className }: TagProps) {
  const variantStyles = {
    type: "bg-primary/10 text-primary hover:bg-primary/20",
    company: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    tag: "bg-muted text-muted-foreground hover:bg-muted/80"
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-medium transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </Badge>
  );
}

interface StoryTypeTagProps {
  type: StoryType;
  className?: string;
}

export function StoryTypeTag({ type, className }: StoryTypeTagProps) {
  const typeColors: Record<StoryType, string> = {
    Launch: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    Announcement: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    Partnership: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    Funding: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    Analysis: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    Regulatory: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    Safety: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    Other: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        "text-xs font-medium",
        typeColors[type],
        className
      )}
    >
      {type}
    </Badge>
  );
}