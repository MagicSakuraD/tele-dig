"use client";

import { useEffect, useRef } from "react";
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
 * A custom hook to publish excavator control commands using an existing ROS connection.
 * @param ros The active ROSLIB.Ros instance.
 * @param controls The excavator control state, or null if not available.
 * @param topicName The name of the topic to publish to.
 */
export const useRosPublisher = (
  ros: ROSLIB.Ros | null,
  controls: ExcavatorControls | null,
  topicName: string = "/pc2000_joint_command"
) => {
  const publisherRef = useRef<ROSLIB.Topic | null>(null);
  const controlsRef = useRef<ExcavatorControls | null>(controls);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep a ref updated with the latest controls to avoid re-triggering the main effect.
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    if (!ros || !ros.isConnected) {
      // If no ROS connection, clear any existing interval and do nothing.
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // 1. Create a publisher if it doesn't exist
    if (!publisherRef.current) {
      publisherRef.current = new ROSLIB.Topic({
        ros,
        name: topicName,
        messageType: "sensor_msgs/msg/JointState",
      });
    }
    const publisher = publisherRef.current;

    // 2. Start publishing loop
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const currentControls = controlsRef.current;
      if (!currentControls) return;

      // 3. Map controls to JointState message
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

    // 4. Cleanup on component unmount or when ros connection changes
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // We don't destroy the publisher here as the ROS instance is managed outside
    };
  }, [ros, topicName]);
};
