import { useState } from "react";
import { TimePanel } from "@/components/TimePanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { LocationsPanel } from "@/components/LocationsPanel";
import { MapArea } from "@/components/MapArea";
import { ShieldCheck } from "lucide-react";

export default function Dashboard() {
  // Default center over Bowling Green, KY (WKU)
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.9850, -86.4550]);
  const [mapZoom, setMapZoom] = useState(13);

  const handleSelectLocation = (lat: number, lon: number) => {
    setMapCenter([lat, lon]);
    setMapZoom(9);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      
      {/* LEFT SIDEBAR - Dashboard Controls */}
      <aside className="w-[380px] h-full flex flex-col gap-4 p-4 z-10 bg-background/50 border-r border-border shadow-2xl backdrop-blur-xl">
        
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
        
        <LocationsPanel onSelectLocation={handleSelectLocation} />
        
      </aside>

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

        {/* Floating Time Panel - Bottom Left */}
        <div className="absolute bottom-6 left-6 z-[400] w-64">
           <TimePanel />
        </div>
      </main>

    </div>
  );
}
