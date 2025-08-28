"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Peer, DataConnection } from "peerjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleIdForm } from "@/components/vehicle-id-form";
import { VideoStreamGrid } from "@/components/video-stream-grid";

export default function ExcavPage() {
  const router = useRouter();
  const [vehicleId, setVehicleId] = React.useState<string | null>(null);
  const [peerConnectionStatus, setPeerConnectionStatus] = React.useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [lastMessage, setLastMessage] = React.useState<string>("");

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    setPeerConnectionStatus("connecting");

    // 1. 创建Peer实例，并连接到与操作端相同的信令服务器
    const peer = new Peer("excav" + vehicleId, {
      host: "cyberc3-cloud-server.sjtu.edu.cn",
      port: 443,
      path: "/cyber",
      secure: true,
      debug: 2,
    });
    peerRef.current = peer;

    // 2. 监听与信令服务器的连接
    peer.on("open", (id) => {
      console.log("Excavator PeerJS is open. My ID is:", id);
      setPeerConnectionStatus("disconnected"); // 准备好接收连接
    });

    // 3. 监听来自操作端的连接请求
    peer.on("connection", (conn) => {
      console.log("Received connection from operator:", conn.peer);
      connRef.current = conn;
      setPeerConnectionStatus("connected");

      conn.on("data", (data) => {
        console.log(`Received message: ${data}`);
        setLastMessage(data as string); // 保存收到的消息
        // 收到消息后可以回复
        conn.send("Message received by excavator!");
      });

      conn.on("open", () => {
        console.log("Data connection is open.");
      });

      conn.on("close", () => {
        console.log("Connection closed.");
        setPeerConnectionStatus("disconnected");
        setLastMessage("");
      });

      conn.on("error", (err) => {
        console.error("Connection error:", err);
        setPeerConnectionStatus("error");
      });
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      setPeerConnectionStatus("error");
    });

    // 4. 组件卸载时清理资源
    return () => {
      console.log("Destroying excavator PeerJS instance.");
      peer.destroy();
    };
  }, [vehicleId]);

  const handleVehicleIdSubmit = (id: string) => {
    setVehicleId(id);
  };

  const handleDisconnect = () => {
    connRef.current?.close();
    peerRef.current?.destroy();
    setVehicleId(null);
    setPeerConnectionStatus("disconnected");
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-100";
      case "connecting":
        return "text-yellow-600 bg-yellow-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getConnectionStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "已连接";
      case "connecting":
        return "连接中...";
      case "error":
        return "连接错误";
      default:
        return "等待连接";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* ... UI部分保持不变 ... */}
      <div className="bg-white border-b shadow-sm">
        <div className="mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">挖掘机车端系统</h1>
                <p className="text-sm text-muted-foreground">
                  Vehicle Terminal System
                </p>
              </div>
            </div>

            {vehicleId && (
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm font-mono">
                  ID: {vehicleId}excavator
                </Badge>
                <Badge
                  className={`text-xs ${getConnectionStatusColor(
                    peerConnectionStatus
                  )}`}
                >
                  {peerConnectionStatus === "connecting" ? (
                    <Wifi className="h-3 w-3 mr-1 animate-pulse" />
                  ) : peerConnectionStatus === "connected" ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {getConnectionStatusText(peerConnectionStatus)}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  断开连接
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!vehicleId ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <VehicleIdForm
              onSubmit={handleVehicleIdSubmit}
              isConnected={peerConnectionStatus === "connected"}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-blue-600" />
                  PeerJS 连接状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-blue-600 mb-1">
                      {vehicleId}excavator
                    </div>
                    <div className="text-sm text-muted-foreground">
                      车辆标识符
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge
                      className={`text-sm ${getConnectionStatusColor(
                        peerConnectionStatus
                      )}`}
                    >
                      {getConnectionStatusText(peerConnectionStatus)}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      连接状态
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {lastMessage
                        ? `收到消息: "${lastMessage}"`
                        : "等待消息..."}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      系统状态
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <VideoStreamGrid vehicleId={vehicleId} />
          </div>
        )}
      </div>
    </div>
  );
}
