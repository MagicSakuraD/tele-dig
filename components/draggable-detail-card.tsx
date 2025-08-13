"use client";

import * as React from "react";
import {
  X,
  Settings,
  Zap,
  Gauge,
  Fuel,
  Clock,
  User,
  MapPin,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Excavator } from "./app-sidebar";

interface DraggableDetailCardProps {
  excavator: Excavator;
  onClose: () => void;
  onRemoteControl: (excavator: Excavator) => void;
}

export function DraggableDetailCard({
  excavator,
  onClose,
  onRemoteControl,
}: DraggableDetailCardProps) {
  const router = useRouter();
  const [position, setPosition] = React.useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".no-drag")) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 限制拖拽范围
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 500;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "offline":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "normal":
        return "正常";
      case "warning":
        return "告警";
      case "offline":
        return "离线";
      default:
        return "未知";
    }
  };

  const getEngineStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getEngineStatusText = (status: string) => {
    switch (status) {
      case "good":
        return "良好";
      case "warning":
        return "注意";
      case "critical":
        return "严重";
      default:
        return "未知";
    }
  };

  const handleRemoteControl = () => {
    // 跳转到远程控制页面
    router.push(`/remote-control/${excavator.id}`);
  };

  return (
    <Card
      ref={cardRef}
      className="fixed w-96 shadow-2xl border-2 z-50 cursor-move select-none"
      style={{
        left: position.x,
        top: position.y,
        transform: isDragging ? "scale(1.02)" : "scale(1)",
        transition: isDragging ? "none" : "transform 0.2s ease",
      }}
      onMouseDown={handleMouseDown}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-blue-600" />
            {excavator.number}
            <Badge variant="secondary" className="text-xs">
              {excavator.model}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`${
                excavator.status === "normal"
                  ? "bg-green-100 text-green-800"
                  : excavator.status === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {getStatusText(excavator.status)}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 no-drag"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本信息 */}
        <div className="space-y-2">
          {/* <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">操作员:</span>
            <span>{excavator.operator}</span>
          </div> */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="font-medium">位置:</span>
            <span>{excavator.location}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">当前任务:</span>
            <span className="ml-2 text-muted-foreground">
              {excavator.taskName}
            </span>
          </div>
        </div>

        <Separator />

        {/* 状态指标 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            设备状态
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>燃油液位</span>
                <span>{excavator.fuelLevel}%</span>
              </div>
              <Progress value={excavator.fuelLevel} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>电池电量</span>
                <span>{excavator.batteryLevel}%</span>
              </div>
              <Progress value={excavator.batteryLevel} className="h-2" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>液压压力</span>
              <span>{excavator.hydraulicPressure} MPa</span>
            </div>
            <Progress
              value={(excavator.hydraulicPressure / 4) * 100}
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">发动机状况:</span>
              <span
                className={`ml-2 font-medium ${getEngineStatusColor(
                  excavator.engineStatus
                )}`}
              >
                {getEngineStatusText(excavator.engineStatus)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">工作时长:</span>
              <span className="ml-2 font-medium">
                {excavator.workingHours}h
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* 实时数据 */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            实时数据
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-blue-500" />
              <span>油耗: {excavator.fuelConsumption}L/h</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span>运行: {excavator.workingHours}h</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* 远程控制按钮 */}
        <div className="flex gap-2">
          <Button
            className="flex-1 no-drag"
            variant={excavator.status === "offline" ? "secondary" : "default"}
            disabled={excavator.status === "offline"}
            onClick={handleRemoteControl}
          >
            <Wrench className="h-4 w-4 mr-2" />
            远程控制
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="no-drag bg-transparent"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {excavator.status === "offline" && (
          <div className="text-xs text-red-600 text-center">
            设备离线，无法进行远程控制
          </div>
        )}
      </CardContent>
    </Card>
  );
}
