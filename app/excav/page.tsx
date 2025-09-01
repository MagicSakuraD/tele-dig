"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Peer, DataConnection, MediaConnection } from "peerjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleIdForm } from "@/components/vehicle-id-form";
import { VideoStreamGrid } from "@/components/video-stream-grid";
import { ExcavatorControls } from "@/hooks/useExcavatorGamepad";
import { useRosPublisher, RosStatus } from "@/hooks/useRosPublisher";
import ROSLIB from "roslib";

export default function ExcavPage() {
  const router = useRouter();
  const [vehicleId, setVehicleId] = React.useState<string | null>(null);
  const [peerConnectionStatus, setPeerConnectionStatus] = React.useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [lastMessage, setLastMessage] =
    React.useState<ExcavatorControls | null>(null);

  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const [rosStatus, setRosStatus] = React.useState<RosStatus>("disconnected");
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // ROS Connection and Publisher
  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

    ros.on("connection", () => {
      console.log("Connected to ROS bridge.");
      setRosStatus("connected");
    });
    ros.on("error", (error: Error) => {
      console.error("Error connecting to ROS bridge:", error);
      setRosStatus("error");
    });
    ros.on("close", () => {
      console.log("Disconnected from ROS bridge.");
      setRosStatus("disconnected");
    });

    rosRef.current = ros;

    return () => {
      ros.close();
    };
  }, []);

  useEffect(() => {
    if (rosStatus !== "connected" || !videoCanvasRef.current) return;

    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2D context for canvas");
      return;
    }

    // 初始化 canvas 尺寸
    canvas.width = 1280;
    canvas.height = 720;

    const listener = new ROSLIB.Topic({
      ros: rosRef.current!,
      name: "/front_camera",
      messageType: "sensor_msgs/msg/Image", // ROS2 格式
    });

    listener.subscribe((message: any) => {
      if (!message.data || !message.width || !message.height) {
        console.warn("Invalid image message: missing data, width, or height");
        return;
      }

      // 更新 canvas 尺寸
      if (canvas.width !== message.width) canvas.width = message.width;
      if (canvas.height !== message.height) canvas.height = message.height;

      // 解码 Base64 字符串为 Uint8Array
      let rawData: Uint8Array;
      try {
        const binaryString = atob(message.data); // 解码 Base64
        rawData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          rawData[i] = binaryString.charCodeAt(i); // 转换为字节
        }
        console.log("Decoded data length:", rawData.length); // 验证长度，应为 1280*720*3 = 3686400
      } catch (error) {
        console.error("Base64 decode error:", error);
        return;
      }

      const imageData = ctx.createImageData(message.width, message.height);

      if (message.encoding === "rgb8") {
        // rgb8 格式，直接映射到 RGBA
        for (let i = 0, j = 0; i < rawData.length; i += 3, j += 4) {
          imageData.data[j] = rawData[i]; // R
          imageData.data[j + 1] = rawData[i + 1]; // G
          imageData.data[j + 2] = rawData[i + 2]; // B
          imageData.data[j + 3] = 255; // Alpha
        }
      } else if (message.encoding === "bgr8") {
        // bgr8 格式，反转通道
        for (let i = 0, j = 0; i < rawData.length; i += 3, j += 4) {
          imageData.data[j] = rawData[i + 2]; // R
          imageData.data[j + 1] = rawData[i + 1]; // G
          imageData.data[j + 2] = rawData[i]; // B
          imageData.data[j + 3] = 255; // Alpha
        }
      } else {
        console.warn("Unsupported encoding:", message.encoding);
        return;
      }

      // 使用 requestAnimationFrame 优化渲染
      requestAnimationFrame(() => {
        ctx.putImageData(imageData, 0, 0);
        if (!mediaStreamRef.current && "captureStream" in canvas) {
          mediaStreamRef.current = (canvas as any).captureStream(24); // 降低帧率优化性能
          console.log("Canvas stream captured at 24fps");
        }
      });
    });

    return () => {
      console.log("Unsubscribing from /front_camera");
      listener.unsubscribe();
    };
  }, [rosStatus, vehicleId]);

  // ROS Control Publisher
  useRosPublisher(rosRef.current, lastMessage);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    setPeerConnectionStatus("connecting");

    // 创建Peer实例
    const peer = new Peer("excav" + vehicleId, {
      host: "cyberc3-cloud-server.sjtu.edu.cn",
      port: 443,
      path: "/cyber",
      secure: true,
      debug: 2,
    });
    peerRef.current = peer;

    // 监听与信令服务器的连接
    peer.on("open", (id) => {
      console.log("Excavator PeerJS is open. My ID is:", id);
      setPeerConnectionStatus("disconnected"); // 准备好接收连接
    });

    // 监听来自操作端的数据连接请求
    peer.on("connection", (conn) => {
      console.log("Received data connection from operator:", conn.peer);
      connRef.current = conn;
      setPeerConnectionStatus("connected");

      conn.on("data", (data) => {
        setLastMessage(data as ExcavatorControls);
      });

      conn.on("open", () => {
        console.log("Data connection is open.");

        // 数据连接建立后，挖掘机端主动发起视频通话
        if (mediaStreamRef.current) {
          console.log("Initiating video call to operator...");
          const call = peer.call(conn.peer, mediaStreamRef.current);
          callRef.current = call;

          call.on("stream", (remoteStream) => {
            console.log("Received remote stream (not needed for excavator)");
          });

          call.on("close", () => {
            console.log("Video call closed");
            callRef.current = null;
          });

          call.on("error", (err) => {
            console.error("Video call error:", err);
          });
        } else {
          console.warn("No media stream available for video call");
        }
      });

      conn.on("close", () => {
        console.log("Data connection closed.");
        setPeerConnectionStatus("disconnected");
        setLastMessage(null);
        if (callRef.current) {
          callRef.current.close();
          callRef.current = null;
        }
      });

      conn.on("error", (err) => {
        console.error("Data connection error:", err);
        setPeerConnectionStatus("error");
      });
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      setPeerConnectionStatus("error");
    });

    return () => {
      console.log("Destroying excavator PeerJS instance.");
      if (callRef.current) {
        callRef.current.close();
      }
      peer.destroy();
    };
  }, [vehicleId]);

  // 监听mediaStream变化，自动发起视频通话
  useEffect(() => {
    if (mediaStreamRef.current && connRef.current && peerRef.current) {
      console.log("Media stream ready, initiating video call...");
      const call = peerRef.current.call(
        connRef.current.peer,
        mediaStreamRef.current
      );
      callRef.current = call;

      call.on("stream", (remoteStream) => {
        console.log("Received remote stream");
      });

      call.on("close", () => {
        console.log("Video call closed");
        callRef.current = null;
      });

      call.on("error", (err) => {
        console.error("Video call error:", err);
      });
    }
  }, [mediaStreamRef.current, connRef.current]);

  const handleVehicleIdSubmit = (id: string) => {
    setVehicleId(id);
  };

  const handleDisconnect = () => {
    if (callRef.current) {
      callRef.current.close();
    }
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

  const getRosStatusColor = (status: RosStatus) => {
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

  const getRosStatusText = (status: RosStatus) => {
    switch (status) {
      case "connected":
        return "已连接";
      case "connecting":
        return "连接中...";
      case "error":
        return "连接错误";
      default:
        return "未连接";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
                  ID: excav{vehicleId}
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
                  Peer: {getConnectionStatusText(peerConnectionStatus)}
                </Badge>
                <Badge className={`text-xs ${getRosStatusColor(rosStatus)}`}>
                  {rosStatus === "connecting" ? (
                    <Wifi className="h-3 w-3 mr-1 animate-pulse" />
                  ) : rosStatus === "connected" ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  ROS: {getRosStatusText(rosStatus)}
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
                  系统连接状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-blue-600 mb-1">
                      excav{vehicleId}
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
                      Peer连接状态
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge
                      className={`text-sm ${getRosStatusColor(rosStatus)}`}
                    >
                      {getRosStatusText(rosStatus)}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      ROS连接状态
                    </div>
                  </div>
                </div>

                {lastMessage && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">
                      最新控制指令:
                    </div>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(lastMessage, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">摄像头视频流</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={videoCanvasRef}
                  className="w-full aspect-video  rounded-lg"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
                <div className="mt-2 text-sm text-muted-foreground text-center">
                  ROS话题: /front_camera | 状态:{" "}
                  {rosStatus === "connected" ? "接收中" : "等待连接"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
