import { useState, useRef, useEffect } from "react";
import cabDriverHero from "@/assets/cab-driver-hero.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Google Sheets setup (one-time):
 * 1. Go to script.google.com → New project → paste:
 *
 *   function doPost(e) {
 *     var sheet = SpreadsheetApp
 *       .openById("1FUgAVFw6ySePZiQMdYI5S6HTeI4BOsD16n5Ou8FfyQs")
 *       .getActiveSheet();
 *     var d = JSON.parse(e.postData.contents);
 *     sheet.appendRow([new Date(), d.name, d.mobile, d.location]);
 *     return ContentService
 *       .createTextOutput(JSON.stringify({ success: true }))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *
 * 2. Deploy → Web app → Execute as: Me, Access: Anyone → copy URL → paste below.
 */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJHApNgNK9alArrcmeRC3mNNZ-YzeeE8uTaDTfzOVpcAJyUMez3-oCljd17o-up6BgiA/exec";

const CITIES = ["Hyderabad", "Bangalore"];

const CabDriverCTA = () => {
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [name, setName]         = useState("");
  const [mobile, setMobile]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !name || !mobile) return;
    setSubmitting(true);

    // 1 — Save to Supabase (reliable backup)
    try {
      await supabase
        .from("driver_applications")
        .insert({ name, mobile, location });
    } catch { /* continue */ }

    // 2 — Send to Google Sheets via GET (Apps Script redirects POST and loses body;
    //     GET with URL params works reliably — no CORS preflight on simple GET requests)
    if (APPS_SCRIPT_URL) {
      try {
        const params = new URLSearchParams({
          name,
          mobile,
          location,
          timestamp: new Date().toLocaleString("en-IN"),
        });
        await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`, {
          method: "GET",
          redirect: "follow",
        });
      } catch { /* silent */ }
    }

    // 3 — Silently notify admin via WhatsApp (AiSensy edge function)
    supabase.functions.invoke("notify-driver-admin", {
      body: { name, mobile, location },
    }).catch(() => { /* silent */ });

    // 4 — Redirect user to WhatsApp with pre-filled message
    const waMsg =
      `🚗 *New Driver Registration — Xplorwing*\n\n` +
      `*Name:* ${name}\n` +
      `*Mobile:* ${mobile}\n` +
      `*Location:* ${location}`;
    window.open(
      `https://wa.me/916362986420?text=${encodeURIComponent(waMsg)}`,
      "_blank"
    );

    // 5 — Success feedback
    setSubmitting(false);
    setSubmitted(true);
    setLocation("");
    setName("");
    setMobile("");

    toast({
      title: "Details submitted successfully! 🎉",
      description: "Thank you! Our team will contact you shortly.",
    });

    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <>
      <style>{`
        .drv-scene {
          width: 90%;
          max-width: 1100px;
          margin: 60px auto 80px;
          position: relative;
        }

        .drv-card {
          background: #1a3322;
          border-radius: 32px;
          height: 300px;
          display: flex;
          align-items: center;
          position: relative;
          overflow: visible;
          box-shadow: 0 20px 60px rgba(20,40,20,.24);
        }

        .drv-card-inner {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image: radial-gradient(circle, #2a4a3233 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .drv-left {
          flex: 1;
          position: relative;
          z-index: 2;
          padding: 0 28px 0 52px;
          max-width: calc(100% - 320px);
        }

        .drv-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1.5px solid #a3e635;
          border-radius: 999px;
          padding: 4px 13px;
          font-size: 10.5px;
          font-weight: 600;
          color: #a3e635;
          margin-bottom: 12px;
          width: fit-content;
        }
        .drv-pill-dot {
          width: 6px; height: 6px;
          background: #a3e635;
          border-radius: 50%;
          animation: drv-blink 2s ease-in-out infinite;
        }
        @keyframes drv-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        .drv-headline {
          font-size: clamp(22px, 2.6vw, 32px);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .drv-headline .accent { color: #a3e635; }

        .drv-tagline {
          font-size: 12.5px;
          color: #7aaa82;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .drv-form {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
        }

        .drv-input, .drv-select {
          height: 2.5rem;
          background: rgba(0,0,0,0.22);
          border: 1px solid rgba(163,230,53,0.18);
          border-radius: 12px;
          color: #e8f5e9;
          font-size: 0.875rem;
          font-weight: 400;
          padding: 0 1rem;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
          min-width: 0;
          flex: 1;
        }
        .drv-input::placeholder { color: rgba(255,255,255,0.32); }
        .drv-input:focus, .drv-select:focus {
          border-color: rgba(163,230,53,0.55);
          background: rgba(0,0,0,0.32);
          box-shadow: 0 0 0 3px rgba(163,230,53,0.08);
        }
        /* Custom location dropdown */
        .drv-loc-wrap {
          position: relative;
          flex: 1;
        }
        .drv-loc-btn {
          height: 2.5rem;
          width: 100%;
          background: rgba(0,0,0,0.22);
          border: 1px solid rgba(163,230,53,0.18);
          border-radius: 12px;
          color: rgba(255,255,255,0.38);
          font-size: 0.875rem;
          font-weight: 400;
          padding: 0 2.2rem 0 1rem;
          outline: none;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: border-color .2s, background .2s, box-shadow .2s;
          position: relative;
        }
        .drv-loc-btn.filled { color: #e8f5e9; }
        .drv-loc-btn.open,
        .drv-loc-btn:focus {
          border-color: rgba(163,230,53,0.55);
          background: rgba(0,0,0,0.32);
          box-shadow: 0 0 0 3px rgba(163,230,53,0.08);
        }
        .drv-loc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .drv-loc-chevron {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          transition: transform .2s;
          pointer-events: none;
        }
        .drv-loc-btn.open .drv-loc-chevron { transform: translateY(-50%) rotate(180deg); }
        .drv-loc-panel {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #1e3d2a;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
          z-index: 50;
        }
        .drv-loc-option {
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.85);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background .15s;
        }
        .drv-loc-option:hover { background: rgba(255,255,255,0.07); }
        .drv-loc-option.selected {
          color: #a3e635;
          background: rgba(163,230,53,0.1);
        }
        .drv-loc-option:not(:last-child) {
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .drv-loc-check {
          margin-left: auto;
          font-size: 12px;
          color: #a3e635;
        }

        .drv-btn {
          height: 2.4rem;
          background: #e5f76e;
          color: #115f10;
          font-size: 0.875rem;
          font-weight: 700;
          padding: 0 22px;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          transition: transform .15s, background .2s, box-shadow .2s;
          flex-shrink: 0;
        }
        .drv-btn:hover:not(:disabled) { background: #d4e65d; transform: translateY(-1px); }
        .drv-btn:active:not(:disabled) { transform: scale(0.98); }
        .drv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .drv-btn-circle {
          width: 20px; height: 20px;
          background: #115f10;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          color: #e5f76e;
        }
        .drv-btn.drv-btn-done {
          background: #22c55e;
          color: #fff;
        }

        /* Image: flush to the right edge, fully inside the card */
        .drv-right {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 320px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          z-index: 3;
          pointer-events: none;
        }
        .drv-right img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: right center;
          display: block;
          filter: drop-shadow(0 20px 44px rgba(0,0,0,0.42));
        }

        .drv-badge {
          position: absolute;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.22);
          padding: 5px 12px;
          border-radius: 100px;
          color: #fff;
          font-size: 9px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          white-space: nowrap;
          pointer-events: none;
          z-index: 6;
        }
        .drv-badge-trips {
          top: 20px;
          right: 155px;
          animation: drv-float 5s ease-in-out infinite 0.3s;
        }
        .drv-badge-earn {
          bottom: 36px;
          right: 18px;
          background: rgba(163,230,53,0.88);
          color: #0d2218;
          border-color: #a3e635;
          font-weight: 700;
          animation: drv-float 6s ease-in-out infinite 1s;
        }
        @keyframes drv-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }

        @media (max-width: 900px) {
          .drv-scene {
            width: 95%;
            margin: 0 auto 60px;
            padding-top: 120px;
          }
          .drv-card {
            flex-direction: column;
            height: auto;
            padding: 0 18px 28px;
            align-items: center;
            text-align: center;
            overflow: visible;
          }

          /* Image goes ABOVE the card, overflowing upward */
          .drv-right {
            position: relative;
            top: auto;
            right: auto;
            bottom: auto;
            transform: none;
            order: -1;
            width: 100%;
            height: auto;
            margin: 0 auto;
            pointer-events: auto;
            justify-content: center;
          }
          .drv-right img {
            width: 100%;
            height: auto;
            object-fit: unset;
            object-position: unset;
            display: block;
            transform: translateY(-110px);
            margin-bottom: -110px;
            filter: drop-shadow(0 16px 32px rgba(0,0,0,0.35));
          }

          .drv-left {
            padding: 0;
            width: 100%;
            max-width: none;
          }

          .drv-pill { margin: 0 auto 12px; }
          .drv-tagline { margin: 0 auto 18px; font-size: 12px; }

          .drv-form {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            width: 100%;
          }
          .drv-input, .drv-select {
            width: 100%;
            min-width: 0;
            flex: none;
            height: 2.75rem;
            font-size: 0.875rem;
            border-radius: 10px;
          }
          .drv-loc-btn {
            height: 2.75rem;
            border-radius: 10px;
          }
          .drv-btn {
            width: fit-content;
            min-width: 140px;
            height: 2.75rem;
            justify-content: center;
            font-size: 0.9rem;
            align-self: center;
            margin: 0 auto;
          }

          .drv-badge { display: none; }
        }
      `}</style>

      <div className="drv-scene">
        <div className="drv-card">
          {/* Dot-grid texture */}
          <div className="drv-card-inner" />

          {/* Left */}
          <div className="drv-left">
            <div className="drv-pill">
              <span className="drv-pill-dot" />
              Now hiring in Hyderabad &amp; Bangalore
            </div>

            <h2 className="drv-headline">
              Drive with us.<br />
              <span className="accent">Earn more.</span>
            </h2>

            <p className="drv-tagline">
              Join India's fastest-growing outstation cab network.<br />
              Flexible hours, guaranteed trips, instant payouts.
            </p>

            <form className="drv-form" onSubmit={handleSubmit}>
              {/* Custom location dropdown */}
              <div className="drv-loc-wrap" ref={locationRef}>
                <button
                  type="button"
                  className={`drv-loc-btn${location ? " filled" : ""}${locationOpen ? " open" : ""}`}
                  onClick={() => !submitting && !submitted && setLocationOpen(o => !o)}
                  disabled={submitting || submitted}
                >
                  <span>📍</span>
                  <span>{location || "Location"}</span>
                  <svg className="drv-loc-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {locationOpen && (
                  <div className="drv-loc-panel">
                    {CITIES.map(city => (
                      <button
                        key={city}
                        type="button"
                        className={`drv-loc-option${location === city ? " selected" : ""}`}
                        onClick={() => { setLocation(city); setLocationOpen(false); }}
                      >
                        <span>📍</span>
                        {city}
                        {location === city && <span className="drv-loc-check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                className="drv-input"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting || submitted}
              />

              <input
                className="drv-input"
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                disabled={submitting || submitted}
              />

              <button
                type="submit"
                className={`drv-btn${submitted ? " drv-btn-done" : ""}`}
                disabled={submitting || submitted}
              >
                {submitted ? (
                  <>✓ Submitted!</>
                ) : submitting ? (
                  <>Submitting…</>
                ) : (
                  <>Join Now</>
                )}
              </button>
            </form>
          </div>

          {/* Floating badges */}
          <div className="drv-badge drv-badge-trips">🚗 1200+ trips / month</div>
          <div className="drv-badge drv-badge-earn">💰 Earn  ₹40,000+/month</div>

          {/* Right image */}
          <div className="drv-right">
            <img src={cabDriverHero} alt="Drive with Xplorwing" />
          </div>

        </div>
      </div>
    </>
  );
};

export default CabDriverCTA;
