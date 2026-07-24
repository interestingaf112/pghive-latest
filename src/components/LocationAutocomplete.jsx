import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

export default function LocationAutocomplete({ onSelect, placeholder = "Enter your college/office/landmark" }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        // center-bias queries to Bangalore
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lat=12.9716&lon=77.5946`
        );
        const data = await res.json();
        setSuggestions(data.features || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Autocomplete suggestions fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (feature) => {
    // Photon returns coordinates in [lng, lat] GeoJSON format
    const [lng, lat] = feature.geometry.coordinates;
    const p = feature.properties;
    
    // Formulate a beautiful label
    const labelParts = [
      p.name,
      p.street,
      p.district || p.city,
      p.state
    ].filter(Boolean);
    
    const shortLabel = p.name || labelParts[0] || 'Selected Location';
    const fullLabel = labelParts.join(', ');

    setQuery(shortLabel);
    setShowDropdown(false);
    onSelect({ lat, lng, label: shortLabel, fullLabel });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--colors-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 36px 10px 36px',
            border: '1px solid var(--colors-hairline)',
            borderRadius: 'var(--rounded-md)',
            fontSize: '13px',
            fontWeight: 500,
            outline: 'none',
            backgroundColor: 'var(--colors-surface-card)',
            color: 'var(--colors-ink)',
            boxShadow: 'var(--shadow-xs)',
            transition: 'border-color 0.2s'
          }}
          onBlur={() => {
            // Keep suggestions visible long enough for MouseDown event triggers to fire
            setTimeout(() => setShowDropdown(false), 200);
          }}
        />
        {isLoading && (
          <Loader2 
            className="animate-spin" 
            size={14} 
            style={{ position: 'absolute', right: query ? '32px' : '12px', color: 'var(--colors-muted)' }} 
          />
        )}
        {query && (
          <button 
            type="button"
            onClick={handleClear}
            style={{ 
              position: 'absolute', 
              right: '12px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--colors-muted)'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--colors-surface-card)',
          border: '1px solid var(--colors-hairline)',
          borderRadius: 'var(--rounded-md)',
          boxShadow: 'var(--shadow-md)',
          maxHeight: '220px',
          overflowY: 'auto',
          margin: '4px 0 0 0',
          padding: 0,
          listStyle: 'none',
          zIndex: 999
        }}>
          {suggestions.map((feature, i) => {
            const p = feature.properties;
            const name = p.name || '';
            const details = [p.street, p.district || p.city].filter(Boolean).join(', ');
            
            return (
              <li
                key={i}
                onMouseDown={() => handleSelect(feature)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  borderBottom: '1px solid var(--colors-hairline-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--colors-body)',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--colors-surface-soft)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <MapPin size={14} style={{ color: 'var(--colors-muted)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, color: 'var(--colors-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  {details && <span style={{ fontSize: '10px', color: 'var(--colors-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
