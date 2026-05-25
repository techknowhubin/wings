import React from 'react';
import './CabFareKPIs.css';

const CabFareKPIs: React.FC = () => {
  return (
    <div className="kpi-wrapper my-8">
      <div className="kpi-grid">
        {/* Card 1: Per KM Rate */}
        <div className="kpi-card dark">
          <div className="kpi-label">Affordable Rate card</div>
          <div className="dual-row">
            <div className="dual-item">
              <div className="d-label">Sedan</div>
              <div className="d-val" style={{ fontSize: '2rem', lineHeight: 1 }}>
                ₹14<span className="d-unit" style={{ fontSize: '0.8rem' }}>/km</span>
              </div>
            </div>
            <div className="dual-item">
              <div className="d-label">SUV</div>
              <div className="d-val" style={{ fontSize: '2rem', lineHeight: 1 }}>
                ₹18<span className="d-unit" style={{ fontSize: '0.8rem' }}>/km</span>
              </div>
            </div>
          </div>
          <span className="kpi-tag green">✓ Fixed · No surge</span>
        </div>

        {/* Card 2: Toll */}
        <div className="kpi-card">
          <div className="kpi-label">Toll charges</div>
          <div className="kpi-value">Not included</div>
          <div className="kpi-sub">Paid at plaza </div>
          <span className="kpi-tag amber">₹150–₹580 est. by route</span>
        </div>

        {/* Card 3: Buffer */}
        <div className="kpi-card lime-card">
          <div className="kpi-label">Buffer included</div>
          <div className="kpi-value">+25 to +100 km</div>
          <div className="kpi-sub">Pre-added to fare · covers detours & city drop variance</div>
          <span className="kpi-tag teal">✓ No mid-trip disputes</span>
        </div>

        {/* Card 4: Overage */}
        <div className="kpi-card">
          <div className="kpi-label">Beyond buffer?</div>
          <div className="kpi-value">Per KM rate applies</div>
          <div className="kpi-sub">Sedan ₹14/km · SUV ₹18/km · billed transparently</div>
          <span className="kpi-tag lime">No penalty charges</span>
        </div>
      </div>
      
      <div className="section-divider">Choose your destination</div>
    </div>
  );
};

export default CabFareKPIs;
