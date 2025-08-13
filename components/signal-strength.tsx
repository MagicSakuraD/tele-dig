"use client";
import { Wifi, WifiOff } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignalStrengthProps {
  strength: number; // 0-100
  packetLoss: number; // in percentage
  latency?: number; // ms
  className?: string;
}

export function SignalStrength({
  strength,
  packetLoss,
  latency,
  className,
}: SignalStrengthProps) {
  const getStrengthColor = () => {
    if (strength > 75) return "text-green-500";
    if (strength > 50) return "text-blue-500";
    if (strength > 25) return "text-yellow-500";
    return "text-red-500";
  };

  const getSignalBars = (strength: number) => {
    const bars = [];
    const barCount = 4;
    const threshold = 100 / barCount;

    for (let i = 0; i < barCount; i++) {
      const isActive = strength > threshold * i;
      bars.push(
        <div
          key={i}
          className={`w-1 bg-current transition-all duration-300 ${
            isActive ? "opacity-100" : "opacity-30"
          }`}
          style={{
            height: `${3 + i * 4}px`,
          }}
        />
      );
    }
    return bars;
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {" "}
          {strength < 20 ? (
            <WifiOff className={`h-4 w-4 ${getStrengthColor()}`} />
          ) : (
            <Wifi className={`h-4 w-4 ${getStrengthColor()}`} />
          )}
          <p>网络质量</p>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex items-end gap-0.5 ${getStrengthColor()}`}>
              {getSignalBars(strength)}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-xs text-muted-foreground">
              延迟:{" "}
              <span className="font-semibold text-foreground">{latency}ms</span>{" "}
              | 丢包率:{" "}
              <span className="font-semibold text-foreground">
                {packetLoss}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
