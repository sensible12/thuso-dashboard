import React, { useState, useMemo } from 'react';
import type { CaseReport } from '../services/BackendService';
import { getCaseId } from '../services/BackendService';
import { MapPin, User, Eye, Navigation } from 'lucide-react';

interface StatsMapProps {
  reports: CaseReport[];
  onSelectReport: (report: CaseReport) => void;
  onFilterCountry?: (country: string) => void;
}

// Convert real GPS (lat, lng) to SVG coordinates (viewBox 0 0 800 620)
// Longitude: 11.0° to 33.5° (delta: 22.5)
// Latitude: -17.0° to -35.2° (delta: -18.2)
function gpsToSvg(lat: number, lng: number): { x: number; y: number } {
  const minLng = 11.0;
  const maxLng = 33.5;
  const minLat = -17.0;
  const maxLat = -35.2;

  const x = ((lng - minLng) / (maxLng - minLng)) * 760 + 20;
  const y = ((lat - minLat) / (maxLat - minLat)) * 580 + 20;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// Coordinates lookup table for Southern African cities, towns, and provinces
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // South Africa
  'soweto': { lat: -26.27, lng: 27.85 },
  'johannesburg': { lat: -26.20, lng: 28.04 },
  'pretoria': { lat: -25.74, lng: 28.18 },
  'gauteng': { lat: -26.15, lng: 28.10 },
  'durban': { lat: -29.85, lng: 31.02 },
  'kwazulu-natal': { lat: -29.00, lng: 30.50 },
  'cape town': { lat: -33.92, lng: 18.42 },
  'western cape': { lat: -33.50, lng: 19.50 },
  'port elizabeth': { lat: -33.96, lng: 25.60 },
  'gqeberha': { lat: -33.96, lng: 25.60 },
  'eastern cape': { lat: -32.50, lng: 26.50 },
  'bloemfontein': { lat: -29.11, lng: 26.21 },
  'free state': { lat: -28.50, lng: 27.00 },
  'polokwane': { lat: -23.90, lng: 29.46 },
  'limpopo': { lat: -23.50, lng: 29.50 },
  'nelspruit': { lat: -25.47, lng: 30.98 },
  'mbombela': { lat: -25.47, lng: 30.98 },
  'mpumalanga': { lat: -25.80, lng: 30.00 },
  'mahikeng': { lat: -25.86, lng: 25.64 },
  'north west': { lat: -26.00, lng: 26.00 },
  'kimberley': { lat: -28.73, lng: 24.76 },
  'northern cape': { lat: -29.50, lng: 21.50 },
  'south africa': { lat: -28.5, lng: 25.0 },

  // Botswana
  'gaborone': { lat: -24.65, lng: 25.91 },
  'francistown': { lat: -21.17, lng: 27.51 },
  'maun': { lat: -19.98, lng: 23.42 },
  'kweneng': { lat: -24.00, lng: 25.00 },
  'ngamiland': { lat: -20.00, lng: 23.00 },
  'south-east': { lat: -24.80, lng: 25.90 },
  'central': { lat: -22.00, lng: 26.50 },
  'botswana': { lat: -22.3, lng: 24.6 },

  // Namibia
  'windhoek': { lat: -22.56, lng: 17.08 },
  'khomas': { lat: -22.60, lng: 17.10 },
  'walvis bay': { lat: -22.95, lng: 14.50 },
  'swakopmund': { lat: -22.68, lng: 14.53 },
  'erongo': { lat: -22.00, lng: 15.50 },
  'oshakati': { lat: -17.78, lng: 15.70 },
  'oshana': { lat: -18.00, lng: 15.70 },
  'keetmanshoop': { lat: -26.57, lng: 18.13 },
  'karas': { lat: -27.00, lng: 18.50 },
  'namibia': { lat: -22.0, lng: 17.5 },

  // Lesotho
  'maseru': { lat: -29.31, lng: 27.48 },
  'berea': { lat: -29.15, lng: 27.85 },
  'leribe': { lat: -28.87, lng: 28.04 },
  'mafeteng': { lat: -29.82, lng: 27.24 },
  'mohale': { lat: -30.15, lng: 27.46 },
  'butha-buthe': { lat: -28.76, lng: 28.24 },
  'lesotho': { lat: -29.6, lng: 28.2 },

  // Eswatini
  'mbabane': { lat: -26.32, lng: 31.14 },
  'manzini': { lat: -26.49, lng: 31.37 },
  'hhohho': { lat: -26.15, lng: 31.30 },
  'lubombo': { lat: -26.50, lng: 31.80 },
  'shiselweni': { lat: -27.00, lng: 31.40 },
  'eswatini': { lat: -26.5, lng: 31.5 }
};

export const StatsMap: React.FC<StatsMapProps> = ({ reports, onSelectReport, onFilterCountry }) => {
  const [selectedPinReport, setSelectedPinReport] = useState<CaseReport | null>(null);
  const [activeCountryFocus, setActiveCountryFocus] = useState<string>('All');
  const [mapStatusFilter, setMapStatusFilter] = useState<'all' | 'missing' | 'found'>('all');
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Filtered reports for map display
  const mapReports = useMemo(() => {
    return reports.filter(r => {
      if (activeCountryFocus !== 'All' && r.country !== activeCountryFocus) return false;
      if (mapStatusFilter !== 'all' && r.status !== mapStatusFilter) return false;
      return true;
    });
  }, [reports, activeCountryFocus, mapStatusFilter]);

  // Country breakdown stats
  const countryStats = useMemo(() => {
    const countries = ['South Africa', 'Botswana', 'Namibia', 'Lesotho', 'Eswatini'];
    return countries.map(c => {
      const cReports = reports.filter(r => r.country === c);
      const missing = cReports.filter(r => r.status === 'missing').length;
      const found = cReports.filter(r => r.status === 'found').length;
      return {
        country: c,
        total: cReports.length,
        missing,
        found
      };
    });
  }, [reports]);

  // Resolve coordinates for each report
  const resolvedPins = useMemo(() => {
    return mapReports.map((r, idx) => {
      const locStr = (r.location + ' ' + (r.province || '') + ' ' + r.country).toLowerCase();
      let matchedCoord: { lat: number; lng: number } | null = null;

      for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
        if (locStr.includes(key)) {
          matchedCoord = coords;
          break;
        }
      }

      if (!matchedCoord) {
        matchedCoord = LOCATION_COORDINATES[r.country.toLowerCase()] || { lat: -28.0, lng: 25.0 };
      }

      // Add a slight deterministic offset so multiple reports in same city don't completely overlap
      const offsetLat = ((idx % 5) - 2) * 0.18;
      const offsetLng = (((idx * 3) % 5) - 2) * 0.18;

      const svgPos = gpsToSvg(matchedCoord.lat + offsetLat, matchedCoord.lng + offsetLng);
      return {
        report: r,
        svgX: svgPos.x,
        svgY: svgPos.y
      };
    });
  }, [mapReports]);

  // SVG Paths for Southern Africa
  // Accurate projected contours:
  // Namibia (Top Left)
  const namibiaPath = `
    M 55,25 
    L 175,25 
    L 350,25 
    L 395,35 
    L 390,52 
    L 350,55 
    L 350,230 
    L 320,230 
    L 320,380 
    L 215,385 
    L 150,380 
    L 120,290 
    L 100,190 
    L 55,75 
    Z
  `;

  // Botswana (Center-North)
  const botswanaPath = `
    M 350,55 
    L 410,55 
    L 530,105 
    L 580,135 
    L 575,220 
    L 535,270 
    L 475,285 
    L 430,300 
    L 370,270 
    L 350,230 
    Z
  `;

  // South Africa (South, encompassing Lesotho and adjacent to Eswatini)
  const southAfricaPath = `
    M 215,385 
    L 320,380 
    L 350,230 
    L 370,270 
    L 430,300 
    L 475,285 
    L 535,270 
    L 575,220 
    L 630,220 
    L 680,245 
    L 685,280 
    L 715,295 
    L 685,340 
    L 700,410 
    L 655,475 
    L 560,540 
    L 475,565 
    L 380,560 
    L 285,550 
    L 245,510 
    L 210,430 
    Z
  `;

  // Lesotho (Enclave inside South Africa)
  const lesothoPath = `
    M 565,390 
    L 600,385 
    L 615,415 
    L 590,440 
    L 555,430 
    L 550,405 
    Z
  `;

  // Eswatini (Between SA and Mozambique)
  const eswatiniPath = `
    M 685,285 
    L 710,295 
    L 715,330 
    L 690,335 
    L 680,305 
    Z
  `;

  const handleCountryClick = (country: string) => {
    setActiveCountryFocus(country === activeCountryFocus ? 'All' : country);
    if (onFilterCountry) {
      onFilterCountry(country === activeCountryFocus ? 'All' : country);
    }
  };

  return (
    <div className="stats-map-container glass">
      {/* Map Header & Controls */}
      <div className="map-toolbar">
        <div className="map-title-group">
          <Navigation size={20} className="text-indigo" />
          <div>
            <h3>Southern Africa Crisis Incident Map</h3>
            <span className="map-subtitle">
              Live geographic distribution of missing persons & resolved cases
            </span>
          </div>
        </div>

        <div className="map-filters-row">
          {/* Country Selector */}
          <div className="map-control-item">
            <label>Region:</label>
            <select
              value={activeCountryFocus}
              onChange={e => handleCountryClick(e.target.value)}
              className="map-select"
            >
              <option value="All">All 5 Countries</option>
              <option value="South Africa">South Africa</option>
              <option value="Botswana">Botswana</option>
              <option value="Namibia">Namibia</option>
              <option value="Lesotho">Lesotho</option>
              <option value="Eswatini">Eswatini</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="map-control-item">
            <label>Status:</label>
            <div className="status-pill-toggle">
              <button
                type="button"
                className={`pill-btn ${mapStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMapStatusFilter('all')}
              >
                All ({reports.length})
              </button>
              <button
                type="button"
                className={`pill-btn text-red ${mapStatusFilter === 'missing' ? 'active-red' : ''}`}
                onClick={() => setMapStatusFilter('missing')}
              >
                🔴 Missing ({reports.filter(r => r.status === 'missing').length})
              </button>
              <button
                type="button"
                className={`pill-btn text-green ${mapStatusFilter === 'found' ? 'active-green' : ''}`}
                onClick={() => setMapStatusFilter('found')}
              >
                🟢 Found ({reports.filter(r => r.status === 'found').length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map + Side Stats Layout */}
      <div className="map-visual-wrapper">
        {/* SVG Interactive Canvas */}
        <div className="svg-map-frame">
          <svg
            viewBox="0 0 780 600"
            className="southern-africa-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="grad-za" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="grad-bw" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="grad-na" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <filter id="glow-hover" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background grid */}
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />

            {/* Ocean Label */}
            <text x="60" y="520" fill="rgba(148, 163, 184, 0.25)" fontSize="13" fontStyle="italic">
              Atlantic Ocean
            </text>
            <text x="630" y="520" fill="rgba(148, 163, 184, 0.25)" fontSize="13" fontStyle="italic">
              Indian Ocean
            </text>

            {/* Country: Namibia */}
            <path
              d={namibiaPath}
              className={`country-polygon ${activeCountryFocus === 'Namibia' ? 'selected' : ''} ${hoveredCountry === 'Namibia' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCountry('Namibia')}
              onMouseLeave={() => setHoveredCountry(null)}
              onClick={() => handleCountryClick('Namibia')}
            />
            <text x="180" y="210" className="country-label">NAMIBIA</text>

            {/* Country: Botswana */}
            <path
              d={botswanaPath}
              className={`country-polygon ${activeCountryFocus === 'Botswana' ? 'selected' : ''} ${hoveredCountry === 'Botswana' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCountry('Botswana')}
              onMouseLeave={() => setHoveredCountry(null)}
              onClick={() => handleCountryClick('Botswana')}
            />
            <text x="430" y="180" className="country-label">BOTSWANA</text>

            {/* Country: South Africa */}
            <path
              d={southAfricaPath}
              className={`country-polygon ${activeCountryFocus === 'South Africa' ? 'selected' : ''} ${hoveredCountry === 'South Africa' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCountry('South Africa')}
              onMouseLeave={() => setHoveredCountry(null)}
              onClick={() => handleCountryClick('South Africa')}
            />
            <text x="430" y="460" className="country-label">SOUTH AFRICA</text>

            {/* Country: Lesotho (Enclave) */}
            <path
              d={lesothoPath}
              className={`country-polygon enclave-country ${activeCountryFocus === 'Lesotho' ? 'selected' : ''} ${hoveredCountry === 'Lesotho' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCountry('Lesotho')}
              onMouseLeave={() => setHoveredCountry(null)}
              onClick={() => handleCountryClick('Lesotho')}
            />
            <text x="580" y="415" className="country-label-mini">LESOTHO</text>

            {/* Country: Eswatini */}
            <path
              d={eswatiniPath}
              className={`country-polygon enclave-country ${activeCountryFocus === 'Eswatini' ? 'selected' : ''} ${hoveredCountry === 'Eswatini' ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCountry('Eswatini')}
              onMouseLeave={() => setHoveredCountry(null)}
              onClick={() => handleCountryClick('Eswatini')}
            />
            <text x="700" y="315" className="country-label-mini">ESWATINI</text>

            {/* Incident Pins */}
            {resolvedPins.map(({ report, svgX, svgY }) => {
              const isMissing = report.status === 'missing';
              const isFound = report.status === 'found';
              const isSelected = selectedPinReport?.id === report.id;

              return (
                <g
                  key={report.id}
                  className={`map-pin-group ${isSelected ? 'active-pin' : ''}`}
                  transform={`translate(${svgX}, ${svgY})`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedPinReport(report);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Pulse ring for active missing cases */}
                  {isMissing && (
                    <circle
                      r="12"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      className="anim-pin-pulse"
                    />
                  )}
                  {isFound && (
                    <circle
                      r="10"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1"
                      opacity="0.6"
                    />
                  )}

                  {/* Marker Core */}
                  <circle
                    r={isSelected ? 8 : 6}
                    fill={isMissing ? '#ef4444' : isFound ? '#10b981' : '#64748b'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="pin-core"
                  />
                </g>
              );
            })}
          </svg>

          {/* Active Pin Card Popup */}
          {selectedPinReport && (
            <div className="pin-popup-card glass anim-fade-in">
              <button
                className="popup-close-btn"
                onClick={() => setSelectedPinReport(null)}
              >
                &times;
              </button>
              <div className="popup-header">
                <div className="popup-avatar">
                  {selectedPinReport.photo_url ? (
                    <img 
                      src={selectedPinReport.photo_url} 
                      alt={selectedPinReport.name} 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement && !e.currentTarget.parentElement.querySelector('svg')) {
                          const s = document.createElement('span');
                          s.textContent = '👤';
                          e.currentTarget.parentElement.appendChild(s);
                        }
                      }}
                    />
                  ) : (
                    <User size={28} />
                  )}
                </div>
                <div className="popup-info">
                  <h4 className="popup-name">{selectedPinReport.name}</h4>
                  <span className="popup-case-id">Case: {getCaseId(selectedPinReport)}</span>
                  <div className="popup-meta-row">
                    <span>{selectedPinReport.age} yrs</span>
                    <span>&bull;</span>
                    <span>{selectedPinReport.country}</span>
                  </div>
                </div>
              </div>

              <div className="popup-details">
                <div className="popup-item">
                  <MapPin size={14} className="text-muted" />
                  <span>{selectedPinReport.location}</span>
                </div>
                <div className="popup-item">
                  <span
                    className={`badge badge-status ${
                      selectedPinReport.status === 'missing'
                        ? 'badge-status-missing'
                        : selectedPinReport.status === 'found'
                        ? 'badge-status-found'
                        : 'badge-status-closed'
                    }`}
                  >
                    {selectedPinReport.status.toUpperCase()}
                  </span>
                  <span className="badge badge-verification badge-yellow">
                    {selectedPinReport.verification_status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary btn-sm mt-2 w-full"
                onClick={() => {
                  onSelectReport(selectedPinReport);
                  setSelectedPinReport(null);
                }}
              >
                <Eye size={14} /> Review Full Case
              </button>
            </div>
          )}
        </div>

        {/* Side Stats & Hotspots Panel */}
        <div className="map-stats-sidebar">
          <h4>Regional Incident Density</h4>
          <p className="sidebar-hint">Select a nation to filter map & moderation feed</p>

          <div className="country-stats-list">
            {countryStats.map(stat => {
              const isSelected = activeCountryFocus === stat.country;
              const pctOfTotal = reports.length > 0 ? Math.round((stat.total / reports.length) * 100) : 0;

              return (
                <div
                  key={stat.country}
                  className={`country-stat-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleCountryClick(stat.country)}
                >
                  <div className="country-stat-header">
                    <span className="country-name-bold">{stat.country}</span>
                    <span className="country-count-tag">{stat.total} Cases</span>
                  </div>

                  <div className="country-meter-bar">
                    <div
                      className="country-meter-fill"
                      style={{ width: `${Math.max(pctOfTotal, 4)}%` }}
                    />
                  </div>

                  <div className="country-stat-sub">
                    <span className="text-red">🔴 {stat.missing} Active</span>
                    <span className="text-green">🟢 {stat.found} Found</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Map Legend */}
          <div className="map-legend-card glass">
            <h5>Map Legend</h5>
            <div className="legend-entry">
              <span className="legend-indicator dot-red"></span>
              <span>Active Missing Person (Real-time pulse)</span>
            </div>
            <div className="legend-entry">
              <span className="legend-indicator dot-green"></span>
              <span>Located & Safe (Case Solved)</span>
            </div>
            <div className="legend-entry">
              <span className="legend-indicator dot-country-fill"></span>
              <span>Interactive Nation (Tap to filter)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
