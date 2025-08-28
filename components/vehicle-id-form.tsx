"use client"

import * as React from "react"
import { Truck, Wifi } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface VehicleIdFormProps {
  onSubmit: (vehicleId: string) => void
  isConnected?: boolean
}

export function VehicleIdForm({ onSubmit, isConnected = false }: VehicleIdFormProps) {
  const [vehicleId, setVehicleId] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleId.trim()) return

    setIsSubmitting(true)

    // 模拟提交延迟
    await new Promise((resolve) => setTimeout(resolve, 1000))

    onSubmit(vehicleId.trim())
    setIsSubmitting(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Truck className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-xl">挖掘机车端系统</CardTitle>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            <Wifi className="h-3 w-3 mr-1" />
            {isConnected ? "已连接" : "未连接"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">挖掘机标识符 (ID)</Label>
            <Input
              id="vehicleId"
              type="text"
              placeholder="请输入挖掘机ID (例如: EX001)"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="text-center font-mono text-lg"
              disabled={isConnected}
            />
            <p className="text-xs text-muted-foreground text-center">此ID将用于PeerJS连接标识</p>
          </div>

          <Button type="submit" className="w-full" disabled={!vehicleId.trim() || isSubmitting || isConnected}>
            {isSubmitting ? "连接中..." : isConnected ? "已连接" : "启动车端系统"}
          </Button>

          {isConnected && <div className="text-center text-sm text-green-600">✓ 车端系统已启动，等待远程连接</div>}
        </form>
      </CardContent>
    </Card>
  )
}
