import { AlertTriangle, Info, ShieldAlert, Cloud, Thermometer, Wind, Droplets } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface WeatherData {
  properties: {
    periods: Array<{
      name: string;
      temperature: number;
      temperatureUnit: string;
      detailedForecast: string;
      shortForecast: string;
      icon: string;
    }>;
  };
}

interface ObservationData {
  properties: {
    textDescription: string;
    temperature: { value: number };
    relativeHumidity: { value: number };
    windSpeed: { value: number };
  };
}

export function AlertsPanel() {
  // Bowling Green, KY (KBWG) Forecast
  const { data: forecast, isLoading: forecastLoading } = useQuery<WeatherData>({
    queryKey: ["/api/forecast"],
    queryFn: async () => {
      const res = await fetch("https://api.weather.gov/gridpoints/LMK/47,38/forecast");
      return res.json();
    },
    refetchInterval: 60000,
  });

  // Bowling Green, KY (KBWG) Observations
  const { data: observations, isLoading: obsLoading } = useQuery<ObservationData>({
    queryKey: ["/api/observations"],
    queryFn: async () => {
      const res = await fetch("https://api.weather.gov/stations/KBWG/observations/latest");
      return res.json();
    },
    refetchInterval: 60000,
  });

  // Alerts for Bowling Green (Warren County KYZ071)
  const { data: alerts } = useQuery<any>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const res = await fetch("https://api.weather.gov/alerts/active/zone/KYZ071");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const warnings = alerts?.features?.filter((f: any) => f.properties.severity === "Extreme" || f.properties.severity === "Severe") || [];
  const watches = alerts?.features?.filter((f: any) => f.properties.severity === "Moderate") || [];
  const advisories = alerts?.features?.filter((f: any) => f.properties.severity === "Minor") || [];

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* Current Observations */}
      <div className="glass-panel rounded-lg p-4 border-l-4 border-l-primary">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4" />
          Observations (KBWG)
        </h3>
        {obsLoading ? (
          <div className="animate-pulse h-16 bg-muted/20 rounded"></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">Temp</span>
                <span className="text-sm font-mono-tech font-bold">
                  {observations?.properties?.temperature?.value ? ((observations.properties.temperature.value * 9/5) + 32).toFixed(1) : "--"}°F
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">Wind</span>
                <span className="text-sm font-mono-tech font-bold">
                  {observations?.properties?.windSpeed?.value ? (observations.properties.windSpeed.value * 0.621371).toFixed(1) : "--"} mph
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">Humidity</span>
                <span className="text-sm font-mono-tech font-bold">
                  {observations?.properties?.relativeHumidity?.value?.toFixed(0) || "--"}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground/80">{observations?.properties?.textDescription}</span>
            </div>
          </div>
        )}
      </div>

      {/* Warnings */}
      {(warnings.length > 0 || !alerts) && (
        <div className="glass-panel rounded-lg p-4 border-l-4 border-l-destructive">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Warnings
            </h3>
            <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded-full">
              {warnings.length} Active
            </span>
          </div>
          <div className="space-y-2">
            {warnings.map((alert: any) => (
              <div key={alert.id} className="bg-background/50 rounded p-2 text-sm border border-destructive/20">
                <div className="font-bold text-foreground">{alert.properties.event}</div>
                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {alert.properties.headline}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast */}
      <div className="glass-panel rounded-lg p-4 border-l-4 border-l-primary/50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary/80 flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4" />
          7-Day Forecast
        </h3>
        {forecastLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted/20 rounded"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {forecast?.properties?.periods?.slice(0, 7).map((period, i) => (
              <div key={i} className="border-b border-border/30 pb-2 last:border-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-primary/90">{period.name}</span>
                  <span className="text-xs font-mono-tech font-bold">{period.temperature}°{period.temperatureUnit}</span>
                </div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  {period.shortForecast}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
