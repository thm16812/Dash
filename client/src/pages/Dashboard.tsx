import { useState } from "react";
import { TimePanel } from "@/components/TimePanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { MapArea } from "@/components/MapArea";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  // Default center over Bowling Green, KY (WKU)
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.9850, -86.4550]);
  const [mapZoom, setMapZoom] = useState(13);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      
      {/* LEFT SIDEBAR - Dashboard Controls */}
      <aside 
        className={`${
          sidebarCollapsed ? "w-0 p-0 overflow-hidden border-r-0" : "w-[380px] p-4 border-r"
        } h-full flex flex-col gap-4 z-10 bg-background/50 border-border shadow-2xl backdrop-blur-xl transition-all duration-300 relative`}
      >
        {!sidebarCollapsed && (
          <>
            {/* Header/Logo Area */}
            <header className="flex items-center gap-3 px-2 pb-2">
              <div className="bg-primary/10 p-2 rounded-lg border border-primary/30">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none text-foreground uppercase">
                  SA<span className="text-primary">GUI</span>
                </h1>
                <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">
                  Situational Awareness
                </p>
              </div>
            </header>

            <AlertsPanel />
          </>
        )}
      </aside>

      {/* Sidebar Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 left-4 z-[500] bg-card/80 backdrop-blur border-border/50"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* MAIN CONTENT - Interactive Map */}
      <main className="flex-1 h-full relative">
        <MapArea center={mapCenter} zoom={mapZoom} />

        {/* YouTube Embed Tool Window */}
        <div className="absolute top-4 right-14 z-[400] glass-panel rounded-lg overflow-hidden border border-border/50 shadow-2xl">
          <iframe 
            width="320" 
            height="180" 
            src="https://www.youtube.com/embed/_PUdkBjyV2A?si=MWgx-TYLPNxdL6w_&autoplay=1&mute=1" 
            title="YouTube video player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen
          ></iframe>
        </div>

        {/* Floating Time Panel - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-[400] w-64">
           <TimePanel />
        </div>
      </main>

    </div>
  );
}
