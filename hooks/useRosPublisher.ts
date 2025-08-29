"use client";

import { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import { ExcavatorControls } from "./useExcavatorGamepad";

// Define ROS connection status types
export type RosStatus = "disconnected" | "connecting" | "connected" | "error";

// Hook configuration
const PUBLISH_INTERVAL = 100; // ms, for 10Hz publishing rate
const JOINT_NAMES = [
  "bucket_linear",
  "arm_linear",
  "boom_linear",
  "body_rotate",
];

/**
 * A custom hook to connect to ROS and publish excavator control commands.
 * @param url The URL of the rosbridge server (e.g., "ws://localhost:9090").
 * @param controls The excavator control state, or null if not available.
 * @param topicName The name of the topic to publish to.
 * @returns The current status of the ROS connection.
 */
export const useRosPublisher = (
  url: string,
  controls: ExcavatorControls | null,
  topicName: string = "/pc2000_joint_command"
): RosStatus => {
  const [status, setStatus] = useState<RosStatus>("disconnected");
  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const publisherRef = useRef<ROSLIB.Topic | null>(null);
  const controlsRef = useRef<ExcavatorControls | null>(controls);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep a ref updated with the latest controls to avoid re-triggering the main effect.
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    if (!url) {
      setStatus("disconnected");
      return;
    }

    // 1. Initialize ROS connection
    const ros = new ROSLIB.Ros({ url });
    rosRef.current = ros;

    ros.on("connection", () => {
      console.log("Connected to ROS bridge.");
      setStatus("connected");

      // 2. Create a publisher
      const publisher = new ROSLIB.Topic({
        ros,
        name: topicName,
        messageType: "sensor_msgs/msg/JointState",
      });
      publisherRef.current = publisher;

      // 3. Start publishing loop
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const currentControls = controlsRef.current;
        if (!currentControls) return;

        // 4. Map controls to JointState message
        const jointStateMsg = new ROSLIB.Message({
          header: {
            stamp: {
              sec: Math.floor(Date.now() / 1000),
              nanosec: (Date.now() % 1000) * 1e6,
            },
            frame_id: "",
          },
          name: JOINT_NAMES,
          position: [
            -currentControls.bucket * 3.0, // bucket_linear
            -currentControls.boom * 3.0, // arm_linear (大臂)
            -currentControls.stick * 3.0, // boom_linear (小臂)
            currentControls.swing * Math.PI, // body_rotate
          ],
          velocity: [0.0, 0.0, 0.0, 0.0],
          effort: [0.0, 0.0, 0.0, 0.0],
        });

        publisher.publish(jointStateMsg);
      }, PUBLISH_INTERVAL);
    });

    ros.on("error", (error: Error) => {
      console.error("Error connecting to ROS bridge:", error);
      setStatus("error");
    });

    ros.on("close", () => {
      console.log("Disconnected from ROS bridge.");
      setStatus("disconnected");
      if (intervalRef.current) clearInterval(intervalRef.current);
    });

    setStatus("connecting");

    // 5. Cleanup on component unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rosRef.current) {
        rosRef.current.close();
      }
    };
  }, [url, topicName]);

  return status;
};
