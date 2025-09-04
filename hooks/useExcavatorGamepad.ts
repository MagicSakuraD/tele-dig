"use client";

import { useState, useEffect, useRef } from "react";

// 定义挖掘机控制状态的接口
export interface ExcavatorControls {
  leftTrack: number; // 左履带: -1 (后) to 1 (前)
  rightTrack: number; // 右履带: -1 (后) to 1 (前)
  swing: number; // 驾驶室旋转: -1 (左) to 1 (右)
  boom: number; // 大臂: -1 (降) to 1 (提)
  stick: number; // 小臂: -1 (收) to 1 (伸)
  bucket: number; // 铲斗: -1 (收) to 1 (翻)
}

// 定义手柄映射配置
const MAPPING = {
  // 左手柄
  LEFT_GAMEPAD_INDEX: 0,
  SWING_AXIS: 0, // 驾驶室旋转 (X轴)
  STICK_AXIS: 1, // 小臂伸缩 (Y轴)
  LEFT_TRACK_AXIS: 9, // 左履带 (轴9)

  // 右手柄
  RIGHT_GAMEPAD_INDEX: 1,
  BUCKET_AXIS: 0, // 铲斗开合 (X轴)
  BOOM_AXIS: 1, // 大臂提降 (Y轴)
  RIGHT_TRACK_AXIS: 9, // 右履带 (轴9)
};

// 轴9的特殊值定义
const TRACK_AXIS_VALUES = {
  FORWARD: -1.0,
  STILL: 1.286,
  BACKWARD: 0.143,
};

// 死区，避免摇杆轻微晃动产生误操作
const DEADZONE = 0.1;

/**
 * 标准化履带轴的函数
 * 将 [FORWARD, STILL, BACKWARD] 的特殊值映射到 [-1, 0, 1] 的标准范围
 * @param value - 原始轴值
 * @returns - 标准化后的值 (-1 to 1)
 */
const normalizeTrackValue = (value: number): number => {
  const { FORWARD, STILL, BACKWARD } = TRACK_AXIS_VALUES;

  // 在静止点附近，视为0
  if (Math.abs(value - STILL) < DEADZONE) {
    return 0;
  }

  // 向前 (从 STILL 到 FORWARD)
  if (value < STILL) {
    // 将 [STILL, FORWARD] 范围 (-2.286) 映射到 [0, 1]
    const range = STILL - FORWARD; // 1.286 - (-1) = 2.286
    const progress = (STILL - value) / range;
    return Math.min(progress, 1.0); // 确保不超过1
  }

  // 向后 (从 STILL 到 BACKWARD)
  if (value < BACKWARD) {
    // 将 [STILL, BACKWARD] 范围 (1.143) 映射到 [0, -1]
    const range = STILL - BACKWARD; // 1.286 - 0.143 = 1.143
    const progress = (STILL - value) / range;
    return Math.max(progress * -1, -1.0); // 确保不超过-1
  }

  // 如果值超出了定义的向后范围，也视为静止
  return 0;
};

/**
 * 标准化普通摇杆轴的函数
 * @param value - 原始轴值 (-1 to 1)
 * @returns - 处理死区后的值
 */
const normalizeAxisValue = (value: number): number => {
  return Math.abs(value) > DEADZONE ? value : 0;
};

export const useExcavatorGamepad = () => {
  const [controls, setControls] = useState<ExcavatorControls>({
    leftTrack: 0,
    rightTrack: 0,
    swing: 0,
    boom: 0,
    stick: 0,
    bucket: 0,
  });

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateControls = () => {
      const gamepads = navigator.getGamepads();
      const leftGamepad = gamepads[MAPPING.LEFT_GAMEPAD_INDEX];
      const rightGamepad = gamepads[MAPPING.RIGHT_GAMEPAD_INDEX];

      setControls({
        // 左手柄控制
        swing: leftGamepad
          ? normalizeAxisValue(leftGamepad.axes[MAPPING.SWING_AXIS])
          : 0,
        // Y轴向前是伸(-1)，向后是收(1)，所以反转值
        stick: leftGamepad
          ? normalizeAxisValue(leftGamepad.axes[MAPPING.STICK_AXIS])
          : 0,
        leftTrack: leftGamepad
          ? normalizeTrackValue(leftGamepad.axes[MAPPING.LEFT_TRACK_AXIS])
          : 0,

        // 右手柄控制
        bucket: rightGamepad
          ? normalizeAxisValue(rightGamepad.axes[MAPPING.BUCKET_AXIS])
          : 0,
        // Y轴向前是降(-1)，向后是提(1)，所以反转值
        boom: rightGamepad
          ? normalizeAxisValue(rightGamepad.axes[MAPPING.BOOM_AXIS])
          : 0,
        rightTrack: rightGamepad
          ? normalizeTrackValue(rightGamepad.axes[MAPPING.RIGHT_TRACK_AXIS])
          : 0,
      });

      animationFrameRef.current = requestAnimationFrame(updateControls);
    };

    // 开始轮询
    updateControls();

    // 清理函数
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return controls;
};
