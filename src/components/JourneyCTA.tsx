import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const JourneyCTA = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 5, y: -y * 5 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .journey-scene {
          position: relative;
          width: 90%;
          max-width: 1400px;
          margin: 100px auto;
          z-index: 1;
          perspective: 1200px;
        }

        .journey-card {
          background: #1a3322;
          border-radius: 28px;
          padding: 40px 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: visible;
          min-height: 300px;
          box-shadow: 0 20px 60px rgba(20,40,20,.24);
          transition: transform 0.3s ease-out;
          transform-style: preserve-3d;
        }

        /* Dot grid inside card */
        .journey-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background-image: radial-gradient(circle, #2a4a3233 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
        }

        .journey-left {
          flex: 1.5;
          position: relative;
          z-index: 2;
          text-align: left;
          transform: translateZ(40px);
          padding-right: 40px;
        }

        .journey-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1.5px solid #a3e635;
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #a3e635;
          margin-bottom: 24px;
          width: fit-content;
        }
        .journey-pill-dot {
          width: 6px; height: 6px;
          background: #a3e635;
          border-radius: 50%;
          animation: journey-blink 2s ease-in-out infinite;
        }
        @keyframes journey-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        .journey-card h2 {
          font-size: clamp(32px, 5vw, 56px);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }
        .journey-card h2 .green { color: #a3e635; }

        .journey-sub {
          font-size: 16px;
          color: #7aaa82;
          line-height: 1.7;
          max-width: 520px;
          margin-bottom: 36px;
        }

        .journey-cta {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          background: #a3e635;
          color: #0d2218;
          font-size: 16px;
          font-weight: 700;
          padding: 14px 20px 14px 32px;
          border-radius: 999px;
          cursor: pointer;
          text-decoration: none;
          transition: transform .2s, box-shadow .2s;
          width: fit-content;
        }
        .journey-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 28px #a3e63540; }
        .journey-cta-circle {
          width: 36px; height: 36px;
          background: #0d2218;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          color: #a3e635;
        }

        .journey-right {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 32px;
          z-index: 2;
          flex-shrink: 0;
          transform: translateZ(60px);
        }

        .journey-sub-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-self: center;
        }

        .journey-sub-card {
          border-radius: 14px;
          padding: 12px 14px;
          width: 140px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .journey-sub-card.cream { background: #f0e8d0; transform: rotate(-2deg); }
        .journey-sub-card.lime  { background: #d4f06b; transform: rotate(2deg); }

        .journey-sc-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #999; margin-bottom: 3px; }
        .journey-sc-amount { font-size: 20px; font-weight: 800; color: #1a1a1a; line-height: 1; margin-bottom: 2px; }
        .journey-sc-earn { font-size: 9px; color: #888; }
        .journey-sc-title { font-size: 10px; font-weight: 700; color: #1a1a1a; }
        .journey-sc-url { font-size: 8px; color: #555; margin-bottom: 8px; }
        .journey-tag {
          background: rgba(255,255,255,.75);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 8.5px;
          font-weight: 600;
          color: #333;
          margin-right: 4px;
          display: inline-block;
        }

        .journey-phone-wrap {
          position: relative;
          z-index: 10;
          margin-top: -100px;
          align-self: center;
          animation: journey-floatPhone 4s ease-in-out infinite;
        }

        @keyframes journey-floatPhone {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }

        .journey-phone {
          width: 200px;
          background: #ffffff;
          border-radius: 40px;
          overflow: hidden;
          padding: 8px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
        }

        .journey-screen {
          background: #f5f1ea;
          border-radius: 34px;
          padding: 24px 12px 16px;
          overflow: hidden;
        }

        .journey-avatar-wrap {
          width: 54px; height: 54px;
          border-radius: 50%;
          background: #c6d6bc;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          margin: 0 auto 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,.10);
        }

        .journey-profile-name { font-size: 14px; font-weight: 900; color: #111; text-align: center; margin-bottom: 4px; }
        .journey-profile-loc { font-size: 10px; color: #cc2a18; text-align: center; margin-bottom: 14px; font-weight: 500; }

        .journey-listing {
          background: #ffffff;
          border-radius: 12px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,.06);
          text-align: left;
        }
        .journey-l-icon { width: 34px; height: 34px; border-radius: 10px; background: #eaf3d6; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .journey-l-title { font-size: 11px; font-weight: 800; color: #111; }
        .journey-l-sub { font-size: 9px; color: #b0b0b0; }

        @media (max-width: 900px) {
          .journey-scene {
            width: 95%;
            margin: 20px auto;
            overflow: visible;
            padding-top: 130px; /* space for phone overflowing above card */
          }
          .journey-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 0 20px 32px;
            gap: 0;
            overflow: visible;
            min-height: auto;
          }
          /* Phone first, content below */
          .journey-right {
            order: 1;
            width: 100%;
            justify-content: center;
            flex-direction: column;
            align-items: center;
            gap: 0;
            margin-bottom: 20px;
            overflow: visible;
          }
          .journey-left {
            order: 2;
            text-align: center;
            padding-right: 0;
            max-width: 100%;
            transform: none;
          }
          .journey-left .journey-pill {
            margin-left: auto;
            margin-right: auto;
          }
          .journey-sub {
            margin: 0 auto 24px;
          }
          .journey-cta {
            margin: 0 auto;
          }
          .journey-phone-wrap {
            position: relative;
            margin-top: -170px; /* adjusted for taller phone */
            margin-bottom: 100px; /* compensate for scaleY extra visual height */
            transform: none;
            animation: journey-floatPhone 4s ease-in-out infinite;
          }
          .journey-phone {
            width: 260px; /* 1.3x of 200px */
            transform: scaleY(1.3);
            transform-origin: top center;
          }
          /* Hide sub-cards on mobile */
          .journey-sub-cards {
            display: none;
          }
        }
      ` }} />

      <div className="journey-scene">
        <div 
          ref={cardRef}
          className="journey-card"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          }}
        >
          <div className="journey-left">
            <div className="journey-pill">
              <span className="journey-pill-dot"></span> Wing Bio · Free to start
            </div>
            <h2>Ready to<br/>grow your<br/><span className="green">business?</span></h2>
            <p className="journey-sub">
              Create your Wing Bio in 10 minutes. Share one link. Let travellers book directly — no commissions, no chaos.
            </p>
            <Link className="journey-cta" to="/host/signup">
              Become a host
              <span className="journey-cta-circle">→</span>
            </Link>
          </div>

          <div className="journey-right">
            <div className="journey-sub-cards">
              <div className="journey-sub-card cream">
                <div className="journey-sc-label">This Month</div>
                <div className="journey-sc-amount">₹28,400</div>
                <div className="journey-sc-earn">Wing Bio earnings</div>
              </div>
              <div className="journey-sub-card lime">
                <div className="journey-sc-title">Your Wing Bio</div>
                <div className="journey-sc-url">xplorwing.com/you</div>
                <div className="journey-tag">Stay</div>
                <div className="journey-tag">Cab</div>
              </div>
            </div>

            <div className="journey-phone-wrap">
              <div className="journey-phone">
                <div className="journey-screen">
                  <div className="journey-avatar-wrap">🧑🏽</div>
                  <div className="journey-profile-name">Chandra's Escapes</div>
                  <div className="journey-profile-loc">📍 Coorg, Karnataka</div>

                  <div className="journey-listing">
                    <div className="journey-l-icon">🏡</div>
                    <div>
                      <div className="journey-l-title">Riverside Cabin</div>
                      <div className="journey-l-sub">₹4,500 / night</div>
                    </div>
                  </div>

                  <div className="journey-listing">
                    <div className="journey-l-icon">🌄</div>
                    <div>
                      <div className="journey-l-title">Sunset Trek</div>
                      <div className="journey-l-sub">₹1,500 · 4 Hours</div>
                    </div>
                  </div>
                  
                  <div className="journey-listing">
                    <div className="journey-l-icon">☕</div>
                    <div>
                      <div className="journey-l-title">Plantation Tour</div>
                      <div className="journey-l-sub">₹800 / person</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default JourneyCTA;
