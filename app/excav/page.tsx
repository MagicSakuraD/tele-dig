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
  const [videoStreamStatus, setVideoStreamStatus] = React.useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");

  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const streamUrlRef = useRef<string>("");

  // ROS Connection (简化版，只用于控制指令发布)
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

  // 视频流处理 - 使用web_video_server
  useEffect(() => {
    if (!vehicleId || !videoCanvasRef.current) return;

    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const videoElement = videoElementRef.current;

    if (!ctx || !videoElement) {
      console.error("Failed to get canvas context or video element");
      return;
    }

    // 设置canvas尺寸
    canvas.width = 1280;
    canvas.height = 720;

    setVideoStreamStatus("connecting");

    // 方案1: 使用MJPEG流 (推荐)
    const mjpegUrl = `http://localhost:8080/stream?topic=/front_camera&type=mjpeg&quality=90&width=1280&height=720`;

    // 方案2: 使用VP8/WebM流 (如果支持)
    // const webmUrl = `http://localhost:8080/stream?topic=/front_camera&type=vp8&quality=90&width=1280&height=720`;

    streamUrlRef.current = mjpegUrl;

    // 创建图像元素来处理MJPEG流
    const img = new Image();
    img.crossOrigin = "anonymous"; // 处理跨域问题

    let animationId: number;
    let lastFrameTime = 0;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    // 渲染循环
    function renderLoop() {
      const now = performance.now();
      if (
        now - lastFrameTime >= FRAME_INTERVAL &&
        img.complete &&
        img.naturalWidth > 0
      ) {
        lastFrameTime = now;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      animationId = requestAnimationFrame(renderLoop);
    }

    img.onload = () => {
      console.log("Video stream loaded successfully");
      setVideoStreamStatus("connected");

      // 启动渲染循环
      renderLoop();

      // 捕获canvas流
      if ("captureStream" in canvas) {
        try {
          mediaStreamRef.current = (canvas as any).captureStream(TARGET_FPS);
          console.log(`Canvas stream captured at ${TARGET_FPS}fps`);
        } catch (error) {
          console.error("Failed to capture canvas stream:", error);
        }
      }
    };

    img.onerror = (err) => {
      console.error("Error loading video stream:", err);
      setVideoStreamStatus("error");

      // 尝试重新连接
      setTimeout(() => {
        if (streamUrlRef.current) {
          console.log("Attempting to reconnect video stream...");
          img.src = streamUrlRef.current + "?t=" + Date.now(); // 添加时间戳避免缓存
        }
      }, 3000);
    };

    // 设置图像源
    img.src = mjpegUrl;

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      img.src = "";
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [vehicleId]);

  // 备用方案：使用video元素处理流
  const initVideoElement = async () => {
    if (!videoElementRef.current || !vehicleId) return;

    const video = videoElementRef.current;
    const canvas = videoCanvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    try {
      // 尝试使用video元素加载流
      const streamUrl = `http://localhost:8080/stream?topic=/front_camera&type=mjpeg`;
      video.src = streamUrl;
      video.crossOrigin = "anonymous";

      await video.play();

      // 从video元素绘制到canvas
      const drawFrame = () => {
        if (video.readyState >= 2) {
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(drawFrame);
      };

      video.addEventListener("loadeddata", () => {
        setVideoStreamStatus("connected");
        drawFrame();

        // 捕获canvas流
        if ("captureStream" in canvas) {
          mediaStreamRef.current = (canvas as any).captureStream(30);
        }
      });
    } catch (error) {
      console.error("Video element approach failed:", error);
      setVideoStreamStatus("error");
    }
  };

  // ROS Control Publisher
  useRosPublisher(rosRef.current, lastMessage);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    setPeerConnectionStatus("connecting");

    const peer = new Peer("excav" + vehicleId, {
      host: "cyberc3-cloud-server.sjtu.edu.cn",
      port: 443,
      path: "/cyber",
      secure: true,
      debug: 2,
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log("Excavator PeerJS is open. My ID is:", id);
      setPeerConnectionStatus("disconnected");
    });

    peer.on("connection", (conn) => {
      console.log("Received data connection from operator:", conn.peer);
      connRef.current = conn;
      setPeerConnectionStatus("connected");

      conn.on("data", (data) => {
        setLastMessage(data as ExcavatorControls);
      });

      conn.on("open", () => {
        console.log("Data connection is open.");

        // 等待媒体流准备好后发起视频通话
        const initCall = () => {
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
            // 如果媒体流还没准备好，等待一下再试
            setTimeout(initCall, 1000);
          }
        };

        initCall();
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
    setVideoStreamStatus("disconnected");
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
      {/* 隐藏的video元素，作为备用方案 */}
      <video
        ref={videoElementRef}
        style={{ display: "none" }}
        muted
        playsInline
        autoPlay
      />

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
                  Vehicle Terminal System (using web_video_server)
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
                <Badge
                  className={`text-xs ${getConnectionStatusColor(
                    videoStreamStatus
                  )}`}
                >
                  {videoStreamStatus === "connecting" ? (
                    <Wifi className="h-3 w-3 mr-1 animate-pulse" />
                  ) : videoStreamStatus === "connected" ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  Video: {getConnectionStatusText(videoStreamStatus)}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="text-center">
                    <Badge
                      className={`text-sm ${getConnectionStatusColor(
                        videoStreamStatus
                      )}`}
                    >
                      {getConnectionStatusText(videoStreamStatus)}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      视频流状态
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
                <div className="relative">
                  <canvas
                    ref={videoCanvasRef}
                    className="w-full aspect-video rounded-lg border"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                  {videoStreamStatus === "connecting" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <Wifi className="h-8 w-8 mx-auto mb-2 animate-pulse text-blue-600" />
                        <div className="text-sm text-gray-600">
                          连接视频流中...
                        </div>
                      </div>
                    </div>
                  )}
                  {videoStreamStatus === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg">
                      <div className="text-center">
                        <WifiOff className="h-8 w-8 mx-auto mb-2 text-red-600" />
                        <div className="text-sm text-red-600">
                          视频流连接失败
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          请确保web_video_server正在运行
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground text-center">
                  <div>视频源: {streamUrlRef.current}</div>
                  <div>状态: {getConnectionStatusText(videoStreamStatus)}</div>
                  <div className="text-xs mt-1">
                    Canvas流: {mediaStreamRef.current ? "已捕获" : "未捕获"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 调试信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">调试信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>启动web_video_server命令:</strong>
                    <code className="ml-2 p-1 bg-gray-100 rounded">
                      ros2 run web_video_server web_video_server
                    </code>
                  </div>
                  <div>
                    <strong>流查看器URL:</strong>
                    <a
                      href={`http://localhost:8080/stream_viewer?topic=/front_camera`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      http://localhost:8080/stream_viewer?topic=/front_camera
                    </a>
                  </div>
                  <div>
                    <strong>直接流URL:</strong>
                    <code className="ml-2 p-1 bg-gray-100 rounded text-xs">
                      {streamUrlRef.current}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
