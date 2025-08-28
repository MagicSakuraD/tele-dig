"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, VideoOff, Maximize2, RotateCcw } from "lucide-react";
import { Peer, DataConnection } from "peerjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalStrength } from "@/components/signal-strength";
import { ThreeScene } from "@/components/three-scene";
import { excavators } from "@/components/app-sidebar";

export default function RemoteControlPage() {
  const params = useParams();
  const router = useRouter();
  const excavatorId = params.id as string;

  // 查找对应的挖掘机
  const excavator = excavators.find((ex) => ex.id === excavatorId);

  // 状态管理
  const [signalStrength, setSignalStrength] = React.useState(85);
  const [packetLoss, setPacketLoss] = React.useState(0.1);
  const [latency, setLatency] = React.useState(45);
  const [connectionStatus, setConnectionStatus] = React.useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  //建立peerjs webrtc连接
  useEffect(() => {
    if (!excavatorId) return;

    // 1. 创建Peer实例
    const peer = new Peer("operator" + excavatorId, {
      host: "cyberc3-cloud-server.sjtu.edu.cn",
      port: 443,
      path: "/cyber",
      secure: true,
      debug: 2,
      config: {
        iceServers: [
          { urls: "stun:111.186.56.118:3478" },
          {
            urls: "turn:111.186.56.118:3478",
            username: "test",
            credential: "123456",
          },
        ],
      },
    });
    peerRef.current = peer;

    // 2. 监听与信令服务器的连接
    peer.on("open", (id) => {
      console.log("Operator PeerJS is open. My ID is:", id);
      setConnectionStatus("connecting");

      // 3. 连接到挖掘机Peer
      const conn = peer.connect("excav" + excavatorId);
      connRef.current = conn;

      // 4. 监听数据连接事件
      conn.on("open", () => {
        console.log("Data connection established with excavator!");
        setConnectionStatus("connected");
        conn.send("Hello from operator!");
      });

      conn.on("data", (data) => {
        console.log("Received data:", data);
        // 在这里处理从挖掘机接收到的数据
      });

      conn.on("close", () => {
        console.log("Connection closed.");
        setConnectionStatus("disconnected");
      });

      conn.on("error", (err) => {
        console.error("Connection error:", err);
        setConnectionStatus("error");
      });
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      setConnectionStatus("error");
    });

    // 5. 组件卸载时清理资源
    return () => {
      console.log("Destroying PeerJS instance.");
      peer.destroy();
    };
  }, [excavatorId]);

  if (!excavator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">挖掘机未找到</h1>
          <Button onClick={() => router.back()}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 主视图 - 前视图 */}
      <div className="absolute inset-0 bg-gradient-to-br">
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <VideoOff className="h-24 w-24 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">前视图</h2>
            <p className="text-gray-400">WebRTC 视频流 - {excavator.number}</p>
            <div className="mt-4 text-sm text-gray-500">
              分辨率: 1920x1080 | 帧率: 30fps | 编码: H.264
            </div>
          </div>
        </div>
      </div>

      {/* 顶部控制栏 */}
      <div className="absolute top-0 left-0 right-0 z-50backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className=""
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="">
              <h1 className="text-lg font-semibold">
                {excavator.number} 远程控制
              </h1>
              <p className="text-sm ">
                {excavator.model} - {excavator.operator}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge
              variant={
                connectionStatus === "connected"
                  ? "default"
                  : connectionStatus === "connecting"
                  ? "secondary"
                  : "destructive"
              }
            >
              {connectionStatus === "connected"
                ? "已连接"
                : connectionStatus === "connecting"
                ? "连接中..."
                : connectionStatus === "error"
                ? "连接错误"
                : "未连接"}
            </Badge>
            <Badge
              variant={
                excavator.status === "normal" ? "default" : "destructive"
              }
              className="text-xs"
            >
              {excavator.status === "normal"
                ? "在线"
                : excavator.status === "warning"
                ? "告警"
                : "离线"}
            </Badge>
            <Button variant="ghost" size="icon" className="">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 左视图浮窗 */}
      <Card className="absolute top-24 left-4 w-80 z-40 h-[230px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            左视图
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-full  rounded flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-500" />
          </div>
        </CardContent>
      </Card>

      {/* 右视图浮窗 */}
      <Card className="absolute top-24 right-4 w-80 z-40 h-[230]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            右视图
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-full rounded flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-500" />
          </div>
        </CardContent>
      </Card>

      {/* 后视图浮窗 */}
      <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80 h-48 z-40">
        <CardHeader className="">
          <CardTitle className="text-sm  flex items-center justify-between">
            后视图
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-4 w-4">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-full rounded flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-500" />
          </div>
        </CardContent>
      </Card>

      {/* 3D姿态监控浮窗 */}
      <div className="absolute bottom-4 left-4 z-50">
        <ThreeScene title={`${excavator.number} 3D姿态监控`} />
      </div>

      {/* 设备信息面板 */}
      <Card className="absolute bottom-4 right-4 w-80 z-40 ">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm ">设备状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-gray-400">
              <span>燃油液位:</span>
              <span className=" ml-2">{excavator.fuelLevel}%</span>
            </div>
            <div className="text-gray-400">
              <span>电池电量:</span>
              <span className=" ml-2">{excavator.batteryLevel}%</span>
            </div>
            <div className="text-gray-400">
              <span>液压压力:</span>
              <span className=" ml-2">{excavator.hydraulicPressure} MPa</span>
            </div>
            <div className="text-gray-400">
              <span>工作时长:</span>
              <span className=" ml-2">{excavator.workingHours}h</span>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-500">
              位置: {excavator.location}
            </div>
            <div className="text-xs text-gray-500">
              任务: {excavator.taskName}
            </div>
          </div>
          <SignalStrength
            strength={signalStrength}
            packetLoss={packetLoss}
            latency={latency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
