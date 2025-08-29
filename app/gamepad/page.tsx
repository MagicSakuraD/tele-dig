"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useExcavatorGamepad } from "@/hooks/useExcavatorGamepad";

// 单个控制的可视化组件
const ControlVisualizer = ({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) => {
  const displayValue = invert ? -value : value;
  const formattedValue = displayValue.toFixed(3);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-white font-mono">{formattedValue}</span>
      </div>
      <div className="relative bg-gray-700 h-4 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-0.5 h-full bg-gray-500"></div>
        </div>
        <div
          className="h-full bg-blue-500 transition-all duration-75 rounded-full"
          style={{
            width: `${Math.abs(displayValue) * 50}%`,
            marginLeft: displayValue < 0 ? `${50 + displayValue * 50}%` : "50%",
          }}
        ></div>
      </div>
    </div>
  );
};

const GamepadDemoPage = () => {
  const controls = useExcavatorGamepad();

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          挖掘机控制 Hook (useExcavatorGamepad) 示例
        </h1>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">实时控制状态</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* 左手柄控制 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-400 border-b border-blue-400/50 pb-2">
                左手柄
              </h3>
              <ControlVisualizer label="驾驶室旋转" value={controls.swing} />
              <ControlVisualizer label="小臂伸缩" value={controls.stick} />
              <ControlVisualizer label="左履带" value={controls.leftTrack} />
            </div>

            {/* 右手柄控制 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-400 border-b border-green-400/50 pb-2">
                右手柄
              </h3>
              <ControlVisualizer label="铲斗开合" value={controls.bucket} />
              <ControlVisualizer label="大臂提降" value={controls.boom} />
              <ControlVisualizer label="右履带" value={controls.rightTrack} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>原始数据输出</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-900 p-4 rounded-md overflow-x-auto text-gray-100">
              {JSON.stringify(controls, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GamepadDemoPage;
