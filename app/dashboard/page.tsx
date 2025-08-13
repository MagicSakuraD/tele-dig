"use client"

import * as React from "react"

import { AppSidebar, type Excavator } from "@/components/app-sidebar"
import { MapView } from "@/components/map-view"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function Dashboard() {
  const [selectedExcavator, setSelectedExcavator] = React.useState<Excavator | undefined>()

  const handleExcavatorSelect = (excavator: Excavator) => {
    setSelectedExcavator(excavator)
  }

  return (
    <SidebarProvider>
      <AppSidebar onExcavatorSelect={handleExcavatorSelect} selectedExcavator={selectedExcavator?.id} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">实时监控中心</h1>
            {selectedExcavator && (
              <span className="text-sm text-muted-foreground">- 当前选中: {selectedExcavator.number}</span>
            )}
          </div>
        </header>
        <div className="flex-1 p-4">
          <MapView selectedExcavator={selectedExcavator} onExcavatorClick={handleExcavatorSelect} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
