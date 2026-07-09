import { useState } from 'react';
import { Compass } from 'lucide-react';

const LOCALITY_COORDS = {
  'Koramangala': { x: 170, y: 230, label: 'Koramangala', radius: 45 },
  'HSR Layout': { x: 230, y: 350, label: 'HSR Layout', radius: 50 },
  'Indiranagar': { x: 210, y: 90, label: 'Indiranagar', radius: 45 },
  'Whitefield': { x: 330, y: 180, label: 'Whitefield', radius: 60 }
};

export default function LocalityMap({ selectedLocality, pgs, onSelectLocality }) {
  const [hoveredLocality, setHoveredLocality] = useState(null);

  // Group listing count per locality
  // Group listing count per locality
  const getLocalityCount = (localityName) => {
    return pgs.filter(pg => pg.locality.toLowerCase() === localityName.toLowerCase()).length;
  };

  // Group average price per locality
  const getLocalityAvgPrice = (localityName) => {
    const zonePgs = pgs.filter(pg => pg.locality.toLowerCase() === localityName.toLowerCase());
    if (zonePgs.length === 0) return 'N/A';
    const total = zonePgs.reduce((sum, pg) => sum + pg.price, 0);
    const avg = Math.round(total / zonePgs.length);
    return `₹${(avg / 1000).toFixed(1)}k avg`;
  };

  const handleFindNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const NEIGHBORHOOD_GPS = {
          'Koramangala': { lat: 12.9352, lon: 77.6245 },
          'HSR Layout': { lat: 12.9121, lon: 77.6446 },
          'Indiranagar': { lat: 12.9719, lon: 77.6412 },
          'Whitefield': { lat: 12.9698, lon: 77.7499 }
        };
        
        let nearestLocality = 'all';
        let minDistance = Infinity;
        
        for (const [name, coords] of Object.entries(NEIGHBORHOOD_GPS)) {
          const d = Math.sqrt(Math.pow(latitude - coords.lat, 2) + Math.pow(longitude - coords.lon, 2));
          if (d < minDistance) {
            minDistance = d;
            nearestLocality = name;
          }
        }
        
        onSelectLocality(nearestLocality);
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  };

  const activeLocality = hoveredLocality || selectedLocality;

  return (
    <div className="locality-map-container" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Map Header */}
      <div className="map-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--colors-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--colors-surface-soft)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={16} className="compass-spin" style={{ color: 'var(--colors-accent-blue)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--colors-ink)', letterSpacing: '-0.2px' }}>Interactive Co-Living Map</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleFindNearMe}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'var(--colors-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            Near Me 📍
          </button>
          <span style={{ fontSize: '10px', color: 'var(--colors-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fuzzy View
          </span>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="map-canvas-wrapper" style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: '16px' }}>
        <svg 
          viewBox="0 0 400 480" 
          width="100%" 
          height="100%" 
          style={{ 
            backgroundColor: 'var(--colors-canvas-parchment)', 
            borderRadius: '12px',
            transition: 'background-color 0.3s ease'
          }}
        >
          {/* Grid Background Pattern */}
          <defs>
            <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--colors-hairline)" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapGrid)" />

          {/* Water Bodies (Lakes) */}
          {/* Ulsoor Lake */}
          <path 
            d="M 120 70 Q 140 60 160 80 T 170 100 Q 150 110 130 95 Z" 
            fill="rgba(59, 130, 246, 0.15)" 
            stroke="rgba(59, 130, 246, 0.3)" 
            strokeWidth="1" 
          />
          <text x="145" y="85" fontSize="8" fill="rgba(59, 130, 246, 0.6)" fontWeight="600" letterSpacing="-0.2px">Ulsoor Lake</text>

          {/* Madiwala Lake */}
          <path 
            d="M 110 380 Q 130 360 150 375 T 160 410 Q 130 420 120 395 Z" 
            fill="rgba(59, 130, 246, 0.15)" 
            stroke="rgba(59, 130, 246, 0.3)" 
            strokeWidth="1" 
          />
          <text x="120" y="395" fontSize="8" fill="rgba(59, 130, 246, 0.6)" fontWeight="600" letterSpacing="-0.2px">Madiwala Lake</text>

          {/* Bellandur Lake */}
          <path 
            d="M 270 240 Q 300 230 320 260 T 330 290 Q 290 310 275 270 Z" 
            fill="rgba(59, 130, 246, 0.12)" 
            stroke="rgba(59, 130, 246, 0.25)" 
            strokeWidth="1" 
          />
          <text x="285" y="270" fontSize="8" fill="rgba(59, 130, 246, 0.5)" fontWeight="600" letterSpacing="-0.2px">Bellandur Lake</text>

          {/* Green Spaces (Parks) */}
          {/* Cubbon Park */}
          <path 
            d="M 60 130 Q 90 120 80 160 T 50 180 Q 40 150 60 130 Z" 
            fill="rgba(34, 197, 94, 0.1)" 
            stroke="rgba(34, 197, 94, 0.2)" 
            strokeWidth="1" 
          />
          <text x="50" y="155" fontSize="8" fill="rgba(34, 197, 94, 0.5)" fontWeight="600" letterSpacing="-0.2px">Cubbon Park</text>

          {/* Primary Transit Roads */}
          {/* Outer Ring Road */}
          <path 
            d="M 40 440 C 120 420, 260 410, 310 320 C 350 250, 360 160, 350 40" 
            fill="none" 
            stroke="var(--colors-hairline)" 
            strokeWidth="2.5" 
            strokeDasharray="4,4" 
            opacity="0.8" 
          />
          <text x="325" y="325" fontSize="7" fill="var(--colors-muted)" letterSpacing="0.2px" transform="rotate(-45 325 325)">Outer Ring Rd</text>

          {/* 100 Feet Road Indiranagar */}
          <path 
            d="M 210 40 L 210 180" 
            fill="none" 
            stroke="var(--colors-hairline)" 
            strokeWidth="2" 
            opacity="0.6" 
          />
          <text x="215" y="130" fontSize="7" fill="var(--colors-muted)" letterSpacing="0.2px" transform="rotate(90 215 130)">100 Ft Rd</text>

          {/* Hosur Road */}
          <path 
            d="M 60 220 L 240 380" 
            fill="none" 
            stroke="var(--colors-hairline)" 
            strokeWidth="2" 
            opacity="0.6" 
          />

          {/* Fuzzy Radius Circular Boundary Overlays */}
          {Object.entries(LOCALITY_COORDS).map(([name, coords]) => {
            const isActive = activeLocality.toLowerCase() === name.toLowerCase() || activeLocality === 'all';
            if (!isActive) return null;
            return (
              <g key={`fuzzy-${name}`}>
                {/* Soft Glowing Ambient Center Circle */}
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r={coords.radius} 
                  fill="var(--colors-primary)" 
                  opacity="0.06" 
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* Outer Dashed Boundary Circle representing 500m proximity range */}
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r={coords.radius} 
                  fill="none" 
                  stroke="var(--colors-primary)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                  opacity="0.25" 
                  className="fuzzy-circle-dash"
                />
                {/* Radius Label */}
                <text 
                  x={coords.x} 
                  y={coords.y - coords.radius - 6} 
                  textAnchor="middle" 
                  fontSize="9" 
                  fill="var(--colors-primary)" 
                  fontWeight="600"
                  opacity="0.6"
                >
                  ~500m Fuzzy Radius
                </text>
              </g>
            );
          })}

          {/* Interactive Locality Markers (Pins) */}
          {Object.entries(LOCALITY_COORDS).map(([name, coords]) => {
            const count = getLocalityCount(name);
            const isSelected = selectedLocality.toLowerCase() === name.toLowerCase();
            const isHovered = hoveredLocality?.toLowerCase() === name.toLowerCase();
            const avgPrice = getLocalityAvgPrice(name);
            
            return (
              <g 
                key={`marker-${name}`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectLocality(isSelected ? 'all' : name)}
                onMouseEnter={() => setHoveredLocality(name)}
                onMouseLeave={() => setHoveredLocality(null)}
              >
                {/* Pin Base Anchor Shadow */}
                <ellipse 
                  cx={coords.x} 
                  cy={coords.y + 4} 
                  rx="6" 
                  ry="2" 
                  fill="rgba(0,0,0,0.15)" 
                />
                
                {/* Outer Pulsing Aura on Hover/Selection */}
                {(isSelected || isHovered) && (
                  <circle 
                    cx={coords.x} 
                    cy={coords.y} 
                    r="16" 
                    fill="var(--colors-accent-blue)" 
                    opacity="0.15" 
                    className="pulse-aura"
                  />
                )}

                {/* Marker Body */}
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r="11" 
                  fill={isSelected ? 'var(--colors-primary)' : 'var(--colors-surface-card)'} 
                  stroke={isSelected ? 'var(--colors-primary)' : 'var(--colors-hairline)'}
                  strokeWidth="1.5"
                  style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
                  className="map-marker-pin"
                />

                {/* Listing Count text inside pin */}
                <text 
                  x={coords.x} 
                  y={coords.y + 3.5} 
                  textAnchor="middle" 
                  fontSize="10" 
                  fontWeight="800" 
                  fill={isSelected ? '#ffffff' : 'var(--colors-ink)'}
                  style={{ transition: 'fill 0.2s ease' }}
                >
                  {count}
                </text>

                {/* Locality Label Box with hover average price tooltip */}
                <g transform={`translate(${coords.x}, ${coords.y + 18})`}>
                  <rect 
                    x="-42" 
                    y="0" 
                    width="84" 
                    height={isHovered || isSelected ? "30" : "18"} 
                    rx="9" 
                    fill="var(--colors-surface-card)" 
                    stroke="var(--colors-hairline)"
                    strokeWidth="1"
                    style={{ transition: 'height 0.2s ease' }}
                  />
                  <text 
                    x="0" 
                    y="12" 
                    textAnchor="middle" 
                    fontSize="9.5" 
                    fontWeight="700" 
                    fill="var(--colors-ink)"
                  >
                    {name}
                  </text>
                  {(isHovered || isSelected) && (
                    <text 
                      x="0" 
                      y="24" 
                      textAnchor="middle" 
                      fontSize="8.5" 
                      fontWeight="600" 
                      fill="var(--colors-muted)"
                    >
                      {avgPrice}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Legend / Info card absolute overlay at bottom left */}
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '24px', 
            left: '24px', 
            backgroundColor: 'var(--colors-surface-card)', 
            border: '1px solid var(--colors-hairline)', 
            borderRadius: '8px', 
            padding: '10px 12px', 
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '180px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--colors-primary)' }}></div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--colors-ink)' }}>Fuzzy Matching</span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--colors-body)', lineHeight: 1.3, margin: 0 }}>
            Exact property locations are locked to protect host privacy and prevent direct bypass.
          </p>
        </div>
      </div>
    </div>
  );
}
