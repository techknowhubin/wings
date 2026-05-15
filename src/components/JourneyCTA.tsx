import React from 'react';
import { Link } from 'react-router-dom';

const JourneyCTA = () => {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .journey-scene {
          position: relative;
          width: 90%;
          max-width: 1400px;
          margin: 100px auto;
          z-index: 1;
        }

        .journey-card {
          background: #1a3322;
          border-radius: 40px;
          padding: 30px 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: visible;
          min-height: 200px;
          box-shadow: 0 20px 60px rgba(20,40,20,.24);
        }

        .journey-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 40px;
          background-image: radial-gradient(circle, #2a4a3233 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
        }

        .journey-left {
          flex: 1.2;
          position: relative;
          z-index: 2;
          text-align: left;
          padding-right: 40px;
        }

        .journey-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1.5px solid #a3e635;
          border-radius: 999px;
          padding: 5px 14px;
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
          font-size: clamp(22px, 4vw, 40px);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }
        .journey-card h2 .green { color: #a3e635; }

        .journey-sub {
          font-size: 14px;
          color: #7aaa82;
          line-height: 1.6;
          max-width: 420px;
          margin-bottom: 28px;
        }

        .journey-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          background: #a3e635;
          color: #0d2218;
          font-size: 16px;
          font-weight: 700;
          padding: 10px 16px 10px 24px;
          border-radius: 999px;
          cursor: pointer;
          text-decoration: none;
          transition: transform .2s, box-shadow .2s;
          width: fit-content;
        }
        .journey-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px #a3e63540; }
        .journey-cta-circle {
          width: 28px; height: 28px;
          background: #0d2218;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px;
          color: #a3e635;
        }

        /* Right section — phone + floaters container */
        .journey-right {
          flex: 1;
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
          min-height: 320px;
        }

        /* Phone mockup */
        .journey-phone-wrap {
          position: relative;
          z-index: 10;
          margin-top: -180px;
          animation: journey-floatPhone 6s ease-in-out infinite;
        }

        @keyframes journey-floatPhone {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-15px) rotate(-1deg); }
        }

        .journey-phone {
          width: 260px;
          height: 540px;
          background: #fff;
          border-radius: 44px;
          padding: 10px;
          box-shadow: 0 30px 80px rgba(11,61,46,0.5), inset 0 0 0 2px rgba(255,255,255,0.5);
        }

        .journey-phone-screen {
          background: #F8F6F0;
          width: 100%;
          height: 100%;
          border-radius: 34px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .journey-phone-notch {
          position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 100px; height: 24px;
          background: #fff;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
          z-index: 10;
        }

        .journey-mockup-inner {
          padding: 20px 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .journey-mockup-inner::-webkit-scrollbar { display: none; }

        .jm-profile { text-align: center; margin-bottom: 6px; }
        .jm-avatar {
          width: 64px; height: 64px;
          background: #DDE5D7;
          border-radius: 50%;
          margin: 0 auto 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          border: 3px solid #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .jm-name { font-size: 12px; font-weight: 800; color: #1a3d2b; }
        .jm-bio { font-size: 8px; color: #6b7c72; margin-top: 2px; }

        .jm-card {
          background: #fff;
          border-radius: 14px;
          padding: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .jm-card-icon {
          width: 40px; height: 40px;
          border-radius: 11px;
          background: #f0f8d0;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .jm-card-info h5 { font-size: 9px; font-weight: 700; color: #1a3d2b; margin: 0 0 1px; }
        .jm-card-info p { font-size: 7.5px; color: #6b7c72; margin: 0; }

        /* --- Floating glass badges --- */
        .j-glass-badge {
          position: absolute;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 7px 12px;
          border-radius: 100px;
          color: #fff;
          font-size: 9px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          z-index: 15;
          white-space: nowrap;
          pointer-events: none;
        }

        /* Positioned well outside the phone (phone is ~260px centered) */
        .j-badge-rating {
          top: 50px;
          right: -20px;
          animation: j-floatBadge 5s ease-in-out infinite 0.5s;
        }
        .j-badge-guests {
          bottom: 40px;
          left: -60px;
          animation: j-floatBadge 6s ease-in-out infinite 1s;
        }
        .j-badge-earnings {
          top: -40px;
          right: -30px;
          background: rgba(163,230,53,0.85);
          color: #0d2218;
          border-color: #a3e635;
          font-weight: 700;
          animation: j-floatBadge 5.5s ease-in-out infinite 1.5s;
        }


        @keyframes j-floatBadge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        /* --- Floating info sub-cards --- */
        .j-sub-card {
          position: absolute;
          border-radius: 16px;
          padding: 14px 16px;
          width: 150px;
          box-shadow: 0 12px 36px rgba(0,0,0,0.2);
          z-index: 15;
          pointer-events: none;
        }
        .j-sub-card.j-sc-earnings {
          background: #f0e8d0;
          top: 20px;
          left: -70px;
          transform: rotate(-3deg);
          animation: j-floatCardL 5s ease-in-out infinite;
        }
        .j-sub-card.j-sc-wingbio {
          background: #d4f06b;
          bottom: 100px;
          right: -60px;
          transform: rotate(3deg);
          animation: j-floatCardR 6s ease-in-out infinite 1s;
        }

        @keyframes j-floatCardL {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50% { transform: rotate(-3deg) translateY(-8px); }
        }
        @keyframes j-floatCardR {
          0%, 100% { transform: rotate(3deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(-8px); }
        }

        .j-sc-label { font-size: 6px; font-weight: 700; text-transform: uppercase; color: #999; margin-bottom: 3px; }
        .j-sc-amount { font-size: 16px; font-weight: 800; color: #1a1a1a; line-height: 1; margin-bottom: 2px; }
        .j-sc-earn { font-size: 7px; color: #777; }
        .j-sc-title { font-size: 8px; font-weight: 700; color: #1a1a1a; }
        .j-sc-url { font-size: 9px; color: #555; margin-bottom: 8px; }
        .j-tag {
          background: rgba(255,255,255,.75);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 8.5px;
          font-weight: 600;
          color: #333;
          margin-right: 4px;
          display: inline-block;
        }

        /* --- Mobile --- */
        @media (max-width: 900px) {
          .journey-scene {
            width: 95%;
            margin: 20px auto;
            overflow: visible;
            padding-top: 200px;
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
          .journey-right {
            order: 1;
            width: 100%;
            justify-content: center;
            flex-direction: column;
            align-items: center;
            gap: 0;
            margin-bottom: 20px;
            overflow: visible;
            min-height: auto;
          }
          .journey-left {
            order: 2;
            text-align: center;
            padding-right: 0;
            max-width: 100%;
          }
          .journey-left .journey-pill {
            margin-left: auto;
            margin-right: auto;
          }
          .journey-sub {
            margin: 0 auto 24px;
          }
          .journey-cta-btn {
            margin: 0 auto;
          }
          .journey-phone-wrap {
            position: relative;
            margin-top: -200px;
            margin-bottom: -20px;
            animation: journey-floatPhone 6s ease-in-out infinite;
          }
          .journey-phone {
            transform: scale(0.82);
            transform-origin: bottom center;
          }
          .j-sub-card,
          .j-glass-badge {
            display: none;
          }
        }
      ` }} />

      <div className="journey-scene">
        <div className="journey-card">
          <div className="journey-left">
            <div className="journey-pill">
              <span className="journey-pill-dot"></span> Wing Bio · Free to start
            </div>
            <h2>Ready to<br />grow your<br /><span className="green">business?</span></h2>
            <p className="journey-sub">
              Create your Wing Bio in 10 minutes. Share one link. Let travellers book directly — no commissions, no chaos.
            </p>
            <Link className="journey-cta-btn" to="/host/signup">
              Become a host
              <span className="journey-cta-circle">→</span>
            </Link>
          </div>

          <div className="journey-right">
            {/* Glass badges — spread around phone */}
            <div className="j-glass-badge j-badge-rating">⭐ 4.9 Rating</div>
            <div className="j-glass-badge j-badge-guests">🔥 120+ Guests Hosted</div>
            <div className="j-glass-badge j-badge-earnings">💰 More earnings</div>


            {/* Earnings sub-card — left of phone */}
            <div className="j-sub-card j-sc-earnings">
              <div className="j-sc-label">This Month</div>
              <div className="j-sc-amount">₹28,400</div>
              <div className="j-sc-earn">Wing Bio earnings</div>
            </div>

            {/* Wing Bio sub-card — right of phone */}
            <div className="j-sub-card j-sc-wingbio">
              <div className="j-sc-title">Your Wing Bio</div>
              <div className="j-sc-url">xplorwing.com/you</div>
              <span className="j-tag">Stay</span>
              <span className="j-tag">Cab</span>
              <span className="j-tag">Tour</span>
            </div>

            {/* Phone mockup */}
            <div className="journey-phone-wrap">
              <div className="journey-phone">
                <div className="journey-phone-notch"></div>
                <div className="journey-phone-screen">
                  <div className="journey-mockup-inner">
                    <div className="jm-profile">
                      <div className="jm-avatar">🏡</div>
                      <div className="jm-name">Misty Coorg stays</div>
                      <div className="jm-bio">📍 Coorg, Karnataka</div>
                    </div>

                    <div className="jm-card">
                      <div className="jm-card-icon">🏡</div>
                      <div className="jm-card-info">
                        <h5>Riverside Cabin</h5>
                        <p>₹4,500 / night · 2 Guests</p>
                      </div>
                    </div>
                    <div className="jm-card">
                      <div className="jm-card-icon">🚙</div>
                      <div className="jm-card-info">
                        <h5>Airport Drop</h5>
                        <p>₹1,200 · Innova Crysta</p>
                      </div>
                    </div>
                    <div className="jm-card">
                      <div className="jm-card-icon">☕</div>
                      <div className="jm-card-info">
                        <h5>Plantation Tour</h5>
                        <p>₹800 / person · 3 Hours</p>
                      </div>
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
