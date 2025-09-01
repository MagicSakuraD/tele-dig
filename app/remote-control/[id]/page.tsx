"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  VideoOff,
  Maximize2,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Peer, DataConnection, MediaConnection } from "peerjs";

import { useExcavatorGamepad } from "@/hooks/useExcavatorGamepad";
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

  // 挖掘机控制
  const controls = useExcavatorGamepad();

  // 状态管理
  const [signalStrength, setSignalStrength] = React.useState(85);
  const [packetLoss, setPacketLoss] = React.useState(0.1);
  const [latency, setLatency] = React.useState(45);
  const [connectionStatus, setConnectionStatus] = React.useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [videoConnectionStatus, setVideoConnectionStatus] = React.useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 当控制器数据变化时，通过peerjs发送
  useEffect(() => {
    if (connRef.current && connRef.current.open && controls) {
      connRef.current.send(controls);
    }
  }, [controls]);

  // 建立peerjs webrtc连接
  useEffect(() => {
    if (!excavatorId) return;

    setConnectionStatus("connecting");

    // 1. 创建操作端Peer实例，使用统一的命名格式
    const peer = new Peer("control" + excavatorId, {
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
          {
            urls: "turn:asia-east.relay.metered.ca:80",
            username: "c0f6e9eca6e8a8dd3ee14525",
            credential: "Yr/JEAAWgXYEg4AW",
          },
        ],
      },
    });
    peerRef.current = peer;

    // 2. 定义 call 处理函数
    const handleCall = (call: MediaConnection) => {
      if (callRef.current) {
        console.log("已有视频通话，忽略重复通话:", call.peer);
        call.close(); // 关闭重复的通话
        return;
      }

      console.log("接收到来自挖掘机的视频通话，来源:", call.peer);
      setVideoConnectionStatus("connecting");

      call.answer();
      callRef.current = call;

      const assignStream = (remoteStream: MediaStream) => {
        if (!videoRef.current) {
          console.log("videoRef 未定义，延迟重试...");
          setTimeout(() => assignStream(remoteStream), 100);
          return;
        }

        console.log("成功接收到挖掘机视频流:", remoteStream.id);
        setVideoConnectionStatus("connected");

        // 检查视频轨道
        const videoTracks = remoteStream.getVideoTracks();
        console.log(
          "Video tracks:",
          videoTracks.map((t) => ({
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
          }))
        );
        if (videoTracks.length === 0) {
          console.error("视频流中没有视频轨道");
          setVideoConnectionStatus("error");
          return;
        }

        // 清理旧流
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
        }

        // 设置新流
        videoRef.current.srcObject = remoteStream;

        // 处理视频加载
        const handleLoadedMetadata = () => {
          console.log(
            "视频metadata加载完成，分辨率:",
            videoRef.current?.videoWidth,
            "x",
            videoRef.current?.videoHeight
          );
          if (
            videoRef.current?.videoWidth === 0 ||
            videoRef.current?.videoHeight === 0
          ) {
            console.error("视频分辨率无效，可能流内容为空");
            setVideoConnectionStatus("error");
            return;
          }

          videoRef.current
            ?.play()
            .then(() => {
              console.log("挖掘机视频播放成功");
            })
            .catch((err) => {
              console.error("视频播放失败，尝试静音播放:", err);
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current
                  .play()
                  .catch((e) => console.error("静音播放失败:", e));
              }
            });
        };

        videoRef.current.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
        videoRef.current.addEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );

        videoRef.current.onplay = () => {
          console.log("挖掘机视频开始播放");
        };

        videoRef.current.onwaiting = () => {
          console.log("视频缓冲中，可能网络不稳定或流中断");
          setVideoConnectionStatus("connecting");
        };

        videoRef.current.onerror = (err) => {
          console.error("挖掘机视频播放错误:", err);
          setVideoConnectionStatus("error");
        };
      };

      call.on("stream", assignStream);

      call.on("close", () => {
        console.log("挖掘机视频通话已关闭");
        setVideoConnectionStatus("disconnected");
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        callRef.current = null;
      });

      call.on("error", (err) => {
        console.error("挖掘机视频通话错误:", err);
        setVideoConnectionStatus("error");
      });
    };

    // 3. 绑定 call 事件（确保只绑定一次）
    peer.on("open", (id) => {
      console.log("操作端 PeerJS 已连接，ID:", id);

      // 4. 操作端主动连接挖掘机端的数据连接
      const targetExcavId = "excav" + excavatorId;
      console.log("尝试连接挖掘机:", targetExcavId);

      const dataConn = peer.connect(targetExcavId, {
        label: "excavator-control-connection",
        metadata: { role: "operator" },
        serialization: "binary",
        reliable: false,
      });
      connRef.current = dataConn;

      // 5. 监听数据连接事件
      dataConn.on("open", () => {
        console.log("数据连接已建立！");
        setConnectionStatus("connected");

        // 发送初始化消息
        dataConn.send({
          type: "operator_connected",
          timestamp: Date.now(),
          operatorId: id,
        });
      });

      dataConn.on("data", (data) => {
        console.log("接收到挖掘机数据:", data);
      });

      dataConn.on("close", () => {
        console.log("数据连接已关闭");
        setConnectionStatus("disconnected");
        if (callRef.current) {
          callRef.current.close();
          callRef.current = null;
          setVideoConnectionStatus("disconnected");
        }
      });

      dataConn.on("error", (err) => {
        console.error("数据连接错误:", err);
        setConnectionStatus("error");
      });
    });

    // 6. 绑定 call 事件
    peer.on("call", handleCall);

    // 7. 组件卸载时清理资源
    return () => {
      console.log("清理挖掘机控制连接...");

      // 清理视频通话
      if (callRef.current) {
        callRef.current.close();
        callRef.current = null;
      }

      // 清理数据连接
      if (connRef.current) {
        connRef.current.close();
        connRef.current = null;
      }

      // 清理 peer 和事件监听
      if (peerRef.current) {
        peerRef.current.off("call", handleCall); // 移除 call 事件监听
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // 清理视频元素
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [excavatorId]);

  // 延迟和网络状态监控
  useEffect(() => {
    if (connectionStatus === "connected" && connRef.current) {
      const monitorStats = async () => {
        try {
          const peerConnection = connRef.current
            ?.peerConnection as RTCPeerConnection;
          if (peerConnection) {
            const stats = await peerConnection.getStats();
            stats.forEach((report) => {
              if (
                report.type === "candidate-pair" &&
                report.currentRoundTripTime
              ) {
                setLatency(Math.round(report.currentRoundTripTime * 1000));
              }
            });
          }
        } catch (err) {
          console.error("网络状态监控错误:", err);
        }
      };

      const interval = setInterval(monitorStats, 1000);
      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  const getConnectionStatusText = (status: string) => {
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

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "default";
      case "connecting":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

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
    <div className="min-h-screen relative overflow-hidden ">
      {/* 主视图 - 挖掘机前视图 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
          style={{
            display: videoConnectionStatus === "connected" ? "block" : "none",
          }}
        />
        {videoConnectionStatus !== "connected" && (
          <div className="text-center">
            <VideoOff className="h-24 w-24 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">
              {videoConnectionStatus === "connecting"
                ? "连接中..."
                : "等待挖掘机视频流..."}
            </h2>
            <p className="text-gray-400">
              {videoConnectionStatus === "error"
                ? "视频连接失败，请检查网络"
                : `正在尝试连接到 ${excavator.number}`}
            </p>
          </div>
        )}
      </div>

      {/* 顶部控制栏 */}
      <div className="absolute top-0 left-0 right-0 z-50 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {excavator.number} 远程控制
              </h1>
              <p className="text-sm">
                {excavator.model} - {excavator.operator}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge
              variant={getConnectionStatusColor(connectionStatus)}
              className="flex items-center gap-1"
            >
              {connectionStatus === "connecting" ? (
                <Wifi className="h-3 w-3 animate-pulse" />
              ) : connectionStatus === "connected" ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              数据: {getConnectionStatusText(connectionStatus)}
            </Badge>

            <Badge
              variant={getConnectionStatusColor(videoConnectionStatus)}
              className="flex items-center gap-1"
            >
              {videoConnectionStatus === "connecting" ? (
                <Wifi className="h-3 w-3 animate-pulse" />
              ) : videoConnectionStatus === "connected" ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              视频: {getConnectionStatusText(videoConnectionStatus)}
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

            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 左视图浮窗 */}
      <Card className="absolute top-24 left-4 w-80 z-40 h-[230px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            左侧摄像头
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/10"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-full rounded flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-500" />
            <span className="ml-2 text-gray-500 text-sm">暂无信号</span>
          </div>
        </CardContent>
      </Card>

      {/* 右视图浮窗 */}
      <Card className="absolute top-24 right-4 w-80 z-40 h-[230px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            右侧摄像头
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/10"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-full rounded flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-500" />
            <span className="ml-2 text-gray-500 text-sm">暂无信号</span>
          </div>
        </CardContent>
      </Card>

      {/* 后视图浮窗 */}
      <Card className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-80 h-48 z-40 border-white/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            后视摄像头
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/10"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-full rounded flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-500" />
            <span className="ml-2 text-gray-500 text-sm">暂无信号</span>
          </div>
        </CardContent>
      </Card>

      {/* 3D姿态监控浮窗 */}
      <div className="absolute bottom-4 left-4 z-50">
        <ThreeScene title={`${excavator.number} 3D姿态监控`} />
      </div>

      {/* 设备信息面板 */}
      <Card className="absolute bottom-4 right-4 w-80 z-40 border-white/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">挖掘机状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span>燃油液位:</span>
              <span className="ml-2">{excavator.fuelLevel}%</span>
            </div>
            <div>
              <span>电池电量:</span>
              <span className="ml-2">{excavator.batteryLevel}%</span>
            </div>
            <div>
              <span>液压压力:</span>
              <span className="ml-2">{excavator.hydraulicPressure} MPa</span>
            </div>
            <div>
              <span>工作时长:</span>
              <span className="ml-2">{excavator.workingHours}h</span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs">位置: {excavator.location}</div>
            <div className="text-xs">任务: {excavator.taskName}</div>
            <div className="text-xs">控制延迟: {latency}ms</div>
          </div>

          <div className="pt-2">
            <SignalStrength
              strength={signalStrength}
              packetLoss={packetLoss}
              latency={latency}
            />
          </div>
        </CardContent>
      </Card>

      {/* 控制状态指示器 */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50">
        <Badge variant="outline">挖掘机远程控制系统 - {excavator.number}</Badge>
      </div>
    </div>
  );
}
