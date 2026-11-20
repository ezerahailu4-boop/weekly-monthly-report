"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui";

interface StatCardProps {
  title: string;
  value: string | number;
  caption?: string;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, caption, delta, deltaPositive, icon }: StatCardProps) {
  const deltaColor = delta
    ? deltaPositive === false
      ? "text-destructive"
      : "text-emerald-600 dark:text-emerald-400"
    : "text-muted-foreground";

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="stat-label text-sm font-normal leading-none">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="stat-card">
          <span className="stat-value text-2xl font-bold">{value}</span>
          {caption && <p className="stat-label mt-0.5">{caption}</p>}
        </div>
        {delta && (
          <div className={`mt-2 ${deltaColor}`}>
            <span className="text-xs font-medium">
              {deltaPositive === false ? "▼" : "▲"} {delta}
            </span>
          </div>
        )}
      </CardContent>
      {delta !== undefined ? (
        <CardFooter className="border-t pt-2">
          <CardDescription>
            {deltaPositive === false ? "Down since last period" : "Up since last period"}
          </CardDescription>
        </CardFooter>
      ) : null}
    </Card>
  );
}
