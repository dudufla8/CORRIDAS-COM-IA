'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Maximize2 } from 'lucide-react';

interface Coords {
  lat: number;
  lng: number;
}

interface MiniMapaRotaProps {
  origemCoords?: Coords | null;
  destinoCoords?: Coords | null;
  origemTexto?: string;
  destinoTexto?: string;
}

export const MiniMapaRota: React.FC<MiniMapaRotaProps> = ({
  origemCoords,
  destinoCoords,
  origemTexto,
  destinoTexto,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [mapaPronto, setMapaPronto] = useState(false);

  // Inicializa o mapa Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Centro padrão: Região Metropolitana de SP / Santos
      const defaultCenter: [number, number] = [-23.9608, -46.3336];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      routeLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapaPronto(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualiza marcadores e rota quando as coordenadas mudam
  useEffect(() => {
    if (!mapaPronto || !mapInstanceRef.current || !routeLayerGroupRef.current) return;

    let isMounted = true;

    async function updateRoute() {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      const layerGroup = routeLayerGroupRef.current;
      if (!map || !layerGroup) return;

      layerGroup.clearLayers();

      const temOrigem = Boolean(origemCoords?.lat && origemCoords?.lng);
      const temDestino = Boolean(destinoCoords?.lat && destinoCoords?.lng);

      if (!temOrigem && !temDestino) {
        return;
      }

      // Ícone Origem (Verde estilo Táxi 2.0 / Uber)
      const iconOrigem = L.divIcon({
        className: 'custom-map-marker-origem',
        html: `
          <div style="background-color: #10b981; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
            A
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      // Ícone Destino (Escuro corporativo)
      const iconDestino = L.divIcon({
        className: 'custom-map-marker-destino',
        html: `
          <div style="background-color: #0f172a; width: 26px; height: 26px; border-radius: 6px; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
            B
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const bounds: [number, number][] = [];

      if (temOrigem && origemCoords) {
        const markerA = L.marker([origemCoords.lat, origemCoords.lng], { icon: iconOrigem });
        markerA.bindPopup(`<b>Embarque (Origem)</b><br/>${origemTexto || ''}`);
        markerA.addTo(layerGroup);
        bounds.push([origemCoords.lat, origemCoords.lng]);
      }

      if (temDestino && destinoCoords) {
        const markerB = L.marker([destinoCoords.lat, destinoCoords.lng], { icon: iconDestino });
        markerB.bindPopup(`<b>Desembarque (Destino)</b><br/>${destinoTexto || ''}`);
        markerB.addTo(layerGroup);
        bounds.push([destinoCoords.lat, destinoCoords.lng]);
      }

      // Se tiver ambos, traça rota via OSRM
      if (temOrigem && temDestino && origemCoords && destinoCoords) {
        setCarregandoRota(true);
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}?overview=full&geometries=geojson`;
          const resp = await fetch(osrmUrl);
          if (resp.ok) {
            const data = await resp.json();
            const coordinates = data.routes?.[0]?.geometry?.coordinates;
            if (coordinates && coordinates.length > 0 && isMounted) {
              const latLngs = coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);

              // Linha de contorno (glow/shadow)
              L.polyline(latLngs, {
                color: '#1e40af',
                weight: 6,
                opacity: 0.35,
              }).addTo(layerGroup);

              // Linha principal da rota (Azul Royal Táxi Digital)
              L.polyline(latLngs, {
                color: '#2563eb',
                weight: 4,
                opacity: 0.95,
                lineJoin: 'round',
              }).addTo(layerGroup);
            }
          } else {
            // Fallback direto com linha tracejada
            L.polyline(
              [
                [origemCoords.lat, origemCoords.lng],
                [destinoCoords.lat, destinoCoords.lng],
              ],
              {
                color: '#2563eb',
                dashArray: '8, 8',
                weight: 3,
                opacity: 0.8,
              }
            ).addTo(layerGroup);
          }
        } catch {
          // Linha reta caso o serviço de roteamento externo esteja inacessível
          L.polyline(
            [
              [origemCoords.lat, origemCoords.lng],
              [destinoCoords.lat, destinoCoords.lng],
            ],
            {
              color: '#2563eb',
              dashArray: '8, 8',
              weight: 3,
              opacity: 0.8,
            }
          ).addTo(layerGroup);
        } finally {
          if (isMounted) setCarregandoRota(false);
        }
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], 14, { animate: true });
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15, animate: true });
      }

      // Invalida tamanho para garantir renderização correta
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }

    updateRoute();

    return () => {
      isMounted = false;
    };
  }, [origemCoords, destinoCoords, origemTexto, destinoTexto, mapaPronto]);

  const temPontos = Boolean(origemCoords || destinoCoords);

  return (
    <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-xs">
      {/* Barra superior de controle do mini mapa */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs text-[10px] font-semibold text-slate-800 flex items-center gap-1.5 pointer-events-auto">
          <Navigation className="w-3 h-3 text-blue-600" />
          <span>Traçado da Rota Leaflet</span>
          {carregandoRota && (
            <span className="text-[9px] text-blue-600 animate-pulse font-normal">• Roteando...</span>
          )}
        </div>

        {temPontos && (
          <button
            type="button"
            onClick={() => {
              if (!mapInstanceRef.current) return;
              const bounds: [number, number][] = [];
              if (origemCoords) bounds.push([origemCoords.lat, origemCoords.lng]);
              if (destinoCoords) bounds.push([destinoCoords.lat, destinoCoords.lng]);
              if (bounds.length > 0) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
              }
            }}
            className="bg-white/90 hover:bg-white backdrop-blur-xs p-1.5 rounded-md border border-slate-200 shadow-2xs text-slate-700 pointer-events-auto transition-colors cursor-pointer"
            title="Ajustar visualização aos pontos"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-48 sm:h-56 z-0" />

      {/* Overlay se ainda não houver pontos identificados */}
      {!temPontos && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center pointer-events-none z-5">
          <div className="w-8 h-8 rounded-full bg-white/90 text-blue-600 flex items-center justify-center shadow-xs mb-1.5">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-800">
            Aguardando origem e destino
          </span>
          <p className="text-[10px] text-slate-600 max-w-xs mt-0.5">
            O trajeto da corrida será plotado em tempo real no mapa assim que os endereços forem extraídos pela IA.
          </p>
        </div>
      )}
    </div>
  );
};
