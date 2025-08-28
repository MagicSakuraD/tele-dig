"use client";

import * as React from "react";
import { Video, VideoOff, Maximize2, Minimize2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VideoStreamProps {
  title: string;
  direction: "front" | "back" | "left" | "right";
  isActive?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

function VideoStream({
  title,
  direction,
  isActive = false,
  onToggleFullscreen,
  isFullscreen = false,
}: VideoStreamProps) {
  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "front":
        return "border-blue-500";
      case "back":
        return "border-green-500";
      case "left":
        return "border-yellow-500";
      case "right":
        return "border-purple-500";
      default:
        return "border-gray-500";
    }
  };

  const getDirectionBg = (direction: string) => {
    switch (direction) {
      case "front":
        return "from-blue-900/20 to-blue-600/20";
      case "back":
        return "from-green-900/20 to-green-600/20";
      case "left":
        return "from-yellow-900/20 to-yellow-600/20";
      case "right":
        return "from-purple-900/20 to-purple-600/20";
      default:
        return "from-gray-900/20 to-gray-600/20";
    }
  };

  return (
    <Card
      className={`${
        isFullscreen ? "fixed inset-4 z-50" : ""
      } ${getDirectionColor(direction)} border-2`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {isActive ? (
              <Video className="h-4 w-4 text-green-500" />
            ) : (
              <VideoOff className="h-4 w-4 text-red-500" />
            )}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="text-xs"
            >
              {isActive ? "在线" : "离线"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div
          className={`w-full ${
            isFullscreen ? "h-[calc(100vh-8rem)]" : "h-48"
          } bg-gradient-to-br ${getDirectionBg(
            direction
          )} rounded border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden`}
        >
          {isActive ? (
            <div className="text-center text-white">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium">WebRTC 视频流</p>
              <p className="text-xs opacity-70">1920x1080 @ 30fps</p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">摄像头离线</p>
              <p className="text-xs opacity-70">等待连接...</p>
            </div>
          )}

          {/* 模拟视频噪点效果 */}
          {isActive && (
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
            </div>
          )}
        </div>

        {/* 视频流信息 */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {isActive ? (
            <span className="text-green-600">● 正在传输</span>
          ) : (
            <span className="text-red-600">● 连接中断</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface VideoStreamGridProps {
  vehicleId: string;
  className?: string;
}

export function VideoStreamGrid({
  vehicleId,
  className,
}: VideoStreamGridProps) {
  const [fullscreenStream, setFullscreenStream] = React.useState<string | null>(
    null
  );
  const [streamStates, setStreamStates] = React.useState({
    front: true,
    back: false,
    left: true,
    right: false,
  });

  // 模拟视频流状态变化
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStreamStates((prev) => ({
        ...prev,
        back: Math.random() > 0.3,
        right: Math.random() > 0.4,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleFullscreen = (direction: string) => {
    setFullscreenStream(fullscreenStream === direction ? null : direction);
  };

  const streams = [
    {
      direction: "front" as const,
      title: "前视摄像头",
      isActive: streamStates.front,
    },
    {
      direction: "back" as const,
      title: "后视摄像头",
      isActive: streamStates.back,
    },
    {
      direction: "left" as const,
      title: "左视摄像头",
      isActive: streamStates.left,
    },
    {
      direction: "right" as const,
      title: "右视摄像头",
      isActive: streamStates.right,
    },
  ];

  return (
    <div className={className}>
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold mb-2">监控视频流</h2>
        <Badge variant="outline" className="text-sm">
          车辆ID: {vehicleId}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {streams.map((stream) => (
          <VideoStream
            key={stream.direction}
            title={stream.title}
            direction={stream.direction}
            isActive={stream.isActive}
            onToggleFullscreen={() => handleToggleFullscreen(stream.direction)}
            isFullscreen={fullscreenStream === stream.direction}
          />
        ))}
      </div>

      {/* 全屏时的背景遮罩 */}
      {fullscreenStream && (
        <div
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setFullscreenStream(null)}
        />
      )}
    </div>
  );
}
