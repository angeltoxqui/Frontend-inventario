import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  data: {
    title: string;
    value: string;
    change: string;
    icon: any;
    trend: string;
  }[];
}

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.map((item, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-lg">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  item.trend === "up"
                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    : item.trend === "down"
                    ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20"
                    : "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                )}
              >
                {item.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {item.change.split(" ")[0]} 
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {item.title}
              </h3>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {item.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}