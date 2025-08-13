"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, RotateCcw, Layers, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DraggableDetailCard } from "./draggable-detail-card";
import type { Excavator } from "./app-sidebar";
import { excavators } from "./app-sidebar";

interface MapViewProps {
  selectedExcavator?: Excavator;
  onExcavatorClick?: (excavator: Excavator) => void;
}

// 固定的挖掘机位置数据
const EXCAVATOR_POSITIONS = [
  { left: "25%", top: "25%" }, // 左上
  { left: "50%", top: "25%" }, // 中上
  { left: "75%", top: "25%" }, // 右上
  { left: "25%", top: "50%" }, // 左中
  { left: "50%", top: "50%" }, // 中心
  { left: "75%", top: "50%" }, // 右中
] as const;

export function MapView({ selectedExcavator, onExcavatorClick }: MapViewProps) {
  const [hoveredExcavator, setHoveredExcavator] = React.useState<string | null>(
    null
  );
  const [detailCardExcavator, setDetailCardExcavator] =
    React.useState<Excavator | null>(null);
  const [mapType, setMapType] = React.useState<"standard" | "satellite">(
    "standard"
  );
  const [zoom, setZoom] = React.useState(13);

  // 当选中挖掘机时，自动聚焦
  React.useEffect(() => {
    if (selectedExcavator) {
      // 这里可以添加地图聚焦逻辑
      console.log(
        `聚焦到挖掘机: ${selectedExcavator.number}`,
        selectedExcavator.coordinates
      );
    }
  }, [selectedExcavator]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "#10b981"; // green-500
      case "warning":
        return "#f59e0b"; // yellow-500
      case "offline":
        return "#ef4444"; // red-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  const handleExcavatorClick = (excavator: Excavator) => {
    onExcavatorClick?.(excavator);
    setDetailCardExcavator(excavator);
  };

  const handleRemoteControl = (excavator: Excavator) => {
    // 这里实现远程控制逻辑
    console.log(`启动远程控制: ${excavator.number}`);
    alert(`正在连接到 ${excavator.number} 进行远程控制...`);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 1, 18));
  const handleZoomOut = () => setZoom(Math.max(zoom - 1, 8));
  const handleReset = () => setZoom(13);
  const toggleMapType = () =>
    setMapType(mapType === "standard" ? "satellite" : "standard");

  return (
    <div className="relative h-full bg-slate-100 rounded-lg overflow-hidden border">
      {/* 地图背景 */}
      <div
        className={`absolute inset-0 ${
          mapType === "satellite"
            ? "bg-gradient-to-br from-green-900 to-blue-900"
            : "bg-gradient-to-br from-green-50 to-blue-50"
        }`}
      >
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-slate-300">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* 挖掘机位置标记 */}
        {excavators.map((excavator, index) => (
          <div
            key={excavator.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110"
            style={{
              left: EXCAVATOR_POSITIONS[index % EXCAVATOR_POSITIONS.length]
                .left,
              top: EXCAVATOR_POSITIONS[index % EXCAVATOR_POSITIONS.length].top,
              zIndex: selectedExcavator?.id === excavator.id ? 20 : 10,
            }}
            onMouseEnter={() => setHoveredExcavator(excavator.id)}
            onMouseLeave={() => setHoveredExcavator(null)}
            onClick={() => handleExcavatorClick(excavator)}
          >
            <div
              className={`relative ${
                selectedExcavator?.id === excavator.id ? "scale-125" : ""
              } transition-transform duration-200`}
            >
              <div
                className="w-6 h-6 rounded-full border-3 border-white shadow-lg relative flex items-center justify-center"
                style={{ backgroundColor: getStatusColor(excavator.status) }}
              >
                <span className="text-white text-xs font-bold">
                  {excavator.number.slice(-1)}
                </span>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
              {selectedExcavator?.id === excavator.id && (
                <div className="absolute -inset-3 border-2 border-blue-500 rounded-full animate-pulse" />
              )}
            </div>

            {/* 悬停信息 */}
            {hoveredExcavator === excavator.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-30">
                <div className="bg-black/90 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                  <div className="font-semibold">
                    {excavator.number} - {excavator.model}
                  </div>
                  <div className="text-gray-300">{excavator.taskName}</div>
                  {/* <div className="text-gray-300">
                    操作员: {excavator.operator}
                  </div> */}
                  <div className="text-gray-300">
                    燃油: {excavator.fuelLevel}% | 电池:{" "}
                    {excavator.batteryLevel}%
                  </div>
                  <div className="text-xs text-gray-400 mt-1">点击查看详情</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 地图控制按钮 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 shadow-md"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 shadow-md"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 shadow-md"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 shadow-md"
          onClick={toggleMapType}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {/* 地图信息 */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Badge variant="secondary" className="text-xs shadow-md">
          缩放: {zoom}x | {mapType === "satellite" ? "卫星图" : "标准地图"}
        </Badge>
        {selectedExcavator && (
          <Badge variant="default" className="text-xs shadow-md ml-3">
            <Navigation className="h-3 w-3 mr-1" />
            已选中: {selectedExcavator.number}
          </Badge>
        )}
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md border">
          <div className="space-y-2">
            <div className="text-xs font-semibold mb-2 text-gray-700">
              设备状态
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-green-500 border border-white shadow-sm flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">1</span>
              </div>
              <span>正常运行</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border border-white shadow-sm flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">2</span>
              </div>
              <span>告警状态</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-red-500 border border-white shadow-sm flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">3</span>
              </div>
              <span>离线状态</span>
            </div>
          </div>
        </div>
      </div>

      {/* 可拖拽的详情卡片 */}
      {detailCardExcavator && (
        <DraggableDetailCard
          excavator={detailCardExcavator}
          onClose={() => setDetailCardExcavator(null)}
          onRemoteControl={handleRemoteControl}
        />
      )}
    </div>
  );
}
