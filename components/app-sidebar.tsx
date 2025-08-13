"use client";

import * as React from "react";
import {
  Search,
  MapPin,
  Fuel,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  Battery,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// 挖掘机数据类型
export interface Excavator {
  id: string;
  number: string;
  model: string;
  taskName: string;
  status: "normal" | "warning" | "offline";
  fuelConsumption: number;
  location: string;
  coordinates: [number, number];
  workingHours: number;
  engineStatus: "good" | "warning" | "critical";
  hydraulicPressure: number;
  fuelLevel: number;
  batteryLevel: number;
  operator: string;
}

// 示例挖掘机数据
export const excavators: Excavator[] = [
  {
    id: "1",
    number: "挖掘机001",
    model: "CAT 320D",
    taskName: "基础开挖A区",
    status: "normal",
    fuelConsumption: 45.2,
    location: "工地A区东侧",
    coordinates: [116.404, 39.915],
    workingHours: 8.5,
    engineStatus: "good",
    hydraulicPressure: 2.3,
    fuelLevel: 85,
    batteryLevel: 92,
    operator: "张师傅",
  },
  {
    id: "2",
    number: "挖掘机002",
    model: "CAT PC200",
    taskName: "土方运输B区",
    status: "warning",
    fuelConsumption: 52.8,
    location: "工地B区中央",
    coordinates: [116.408, 39.918],
    workingHours: 7.2,
    engineStatus: "warning",
    hydraulicPressure: 2.8,
    fuelLevel: 42,
    batteryLevel: 78,
    operator: "李师傅",
  },
  {
    id: "3",
    number: "挖掘机003",
    model: "HITACHI ZX200",
    taskName: "平整作业C区",
    status: "normal",
    fuelConsumption: 38.6,
    location: "工地C区南侧",
    coordinates: [116.412, 39.912],
    workingHours: 9.1,
    engineStatus: "good",
    hydraulicPressure: 2.1,
    fuelLevel: 78,
    batteryLevel: 88,
    operator: "王师傅",
  },
  {
    id: "4",
    number: "挖掘机004",
    model: "VOLVO EC210",
    taskName: "维护检修",
    status: "offline",
    fuelConsumption: 0,
    location: "维修车间",
    coordinates: [116.406, 39.92],
    workingHours: 0,
    engineStatus: "critical",
    hydraulicPressure: 0,
    fuelLevel: 95,
    batteryLevel: 15,
    operator: "维修中",
  },
  {
    id: "5",
    number: "挖掘机005",
    model: "SANY SY215",
    taskName: "深挖作业D区",
    status: "warning",
    fuelConsumption: 61.3,
    location: "工地D区北侧",
    coordinates: [116.41, 39.908],
    workingHours: 6.8,
    engineStatus: "warning",
    hydraulicPressure: 3.2,
    fuelLevel: 28,
    batteryLevel: 65,
    operator: "赵师傅",
  },
  {
    id: "6",
    number: "挖掘机006",
    model: "XCMG XE215",
    taskName: "回填作业E区",
    status: "normal",
    fuelConsumption: 42.1,
    location: "工地E区西侧",
    coordinates: [116.402, 39.913],
    workingHours: 8.9,
    engineStatus: "good",
    hydraulicPressure: 2.4,
    fuelLevel: 67,
    batteryLevel: 81,
    operator: "陈师傅",
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onExcavatorSelect?: (excavator: Excavator) => void;
  selectedExcavator?: string;
}

export function AppSidebar({
  onExcavatorSelect,
  selectedExcavator,
  ...props
}: AppSidebarProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  // 按状态分组并过滤
  const groupedExcavators = React.useMemo(() => {
    const filtered = excavators.filter(
      (ex) =>
        ex.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.operator.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
      normal: filtered.filter((ex) => ex.status === "normal"),
      warning: filtered.filter((ex) => ex.status === "warning"),
      offline: filtered.filter((ex) => ex.status === "offline"),
    };
  }, [searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "normal":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 text-xs"
          >
            正常
          </Badge>
        );
      case "warning":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 text-xs"
          >
            告警
          </Badge>
        );
      case "offline":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 text-xs"
          >
            离线
          </Badge>
        );
      default:
        return null;
    }
  };

  const ExcavatorItem = ({ excavator }: { excavator: Excavator }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => onExcavatorSelect?.(excavator)}
        isActive={selectedExcavator === excavator.id}
        className="h-auto p-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-start gap-3 w-full">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(excavator.status)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm">
                  {excavator.number}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {excavator.model}
                </span>
              </div>
              {getStatusBadge(excavator.status)}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {excavator.taskName}
            </p>
            {/* <div className="text-xs text-muted-foreground">
              <span>操作员: {excavator.operator}</span>
            </div> */}
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                <span>{excavator.fuelLevel}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{excavator.workingHours}h</span>
              </div>
              <div className="flex items-center gap-1">
                <Battery className="h-3 w-3" />
                <span>{excavator.batteryLevel}%</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{excavator.location}</span>
            </div>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const totalExcavators = excavators.length;
  const onlineCount =
    groupedExcavators.normal.length + groupedExcavators.warning.length;

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">挖掘机云控</h2>
            <Badge variant="outline" className="text-xs">
              {onlineCount}/{totalExcavators} 在线
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索挖掘机..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1">
          {/* 正常状态 */}
          {groupedExcavators.normal.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 text-green-700">
                <Wifi className="h-4 w-4 text-green-500" />
                正常运行 ({groupedExcavators.normal.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupedExcavators.normal.map((excavator) => (
                    <ExcavatorItem key={excavator.id} excavator={excavator} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* 告警状态 */}
          {groupedExcavators.warning.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                告警状态 ({groupedExcavators.warning.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupedExcavators.warning.map((excavator) => (
                    <ExcavatorItem key={excavator.id} excavator={excavator} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* 离线状态 */}
          {groupedExcavators.offline.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 text-red-700">
                <WifiOff className="h-4 w-4 text-red-500" />
                离线状态 ({groupedExcavators.offline.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupedExcavators.offline.map((excavator) => (
                    <ExcavatorItem key={excavator.id} excavator={excavator} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* 无搜索结果 */}
          {searchTerm &&
            groupedExcavators.normal.length === 0 &&
            groupedExcavators.warning.length === 0 &&
            groupedExcavators.offline.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">未找到匹配的挖掘机</p>
              </div>
            )}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
