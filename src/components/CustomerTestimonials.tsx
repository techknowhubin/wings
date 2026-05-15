import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Amit V.",
    title: "Traveler from Bangalore",
    text: "Booking our Coorg stay through Xplorwing was so seamless. The direct WhatsApp contact with the host made everything personal and easy. Highly recommended!",
    avatar: "🏡"
  },
  {
    name: "Sanya Malhotra",
    title: "Adventure Enthusiast",
    text: "I love the Wing Bio layout. It's so much better than browsing through hundreds of generic listings. Finding unique cabins was a breeze!",
    avatar: "🎒"
  },
  {
    name: "Karan J.",
    title: "Road Tripper",
    text: "Rented a Thar for our Spiti trip. The car was in great condition, and the transparent pricing was refreshing. No hidden fees at all.",
    avatar: "🚗"
  },
  {
    name: "Priyanka Sethi",
    title: "Solo Traveler",
    text: "The Wing Pass QR check-in is futuristic! No more carrying physical IDs or waiting at the reception. Just scan and enter. So convenient.",
    avatar: "📸"
  },
  {
    name: "Rohan Das",
    title: "Family Traveler",
    text: "We stayed at a heritage homestay in Jaipur. The host was amazing, and the prices were much better than other big travel sites. Real value for money.",
    avatar: "👨‍👩‍👧‍👦"
  },
  {
    name: "Ishani G.",
    title: "Backpacker",
    text: "Found the perfect sunset trek in Munnar. The guide was verified and knew all the secret spots. Best part of our entire trip!",
    avatar: "🏔️"
  }
];

const CustomerTestimonials = () => {
  return (
    <section className="testi-section-home py-24 overflow-hidden bg-[#f8f6f0]">
      <style dangerouslySetInnerHTML={{ __html: `
        .testi-badge-top-home { display: flex; flex-direction: column; align-items: center; margin-bottom: 50px; }
        .testi-stars-home { color: #c8e64c; font-size: 20px; margin-bottom: 8px; }
        .testi-rating-text-home { font-size: 14px; font-weight: 700; color: #1a3d2b; letter-spacing: 0.5px; }

        .testi-container-home { display: flex; flex-direction: column; gap: 24px; position: relative; }
        .testi-row-home { display: flex; gap: 24px; width: max-content; }
        .testi-row-home.ltr { animation: marquee-ltr-home 45s linear infinite; }
        .testi-row-home.rtl { animation: marquee-rtl-home 45s linear infinite; }
        .testi-row-home:hover { animation-play-state: paused; }

        @keyframes marquee-ltr-home { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @keyframes marquee-rtl-home { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .testi-card-home { 
          background: #ffffff; 
          border: 1.5px solid #e5e1d4; 
          border-radius: 28px; 
          padding: 32px; 
          width: 380px; 
          flex-shrink: 0; 
          display: flex; 
          flex-direction: column; 
          gap: 18px; 
          box-shadow: 0 2px 12px rgba(26,61,43,.07); 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .testi-card-home:hover { border-color: #c8e64c; transform: translateY(-5px); box-shadow: 0 8px 36px rgba(26,61,43,.13); }
        .testi-quote-home { color: #c8e64c; font-size: 44px; line-height: 1; font-family: serif; font-weight: 900; }
        .testi-text-home { font-size: 14.5px; line-height: 1.65; color: #1a3d2b; font-weight: 500; }
        .testi-footer-home { display: flex; align-items: center; gap: 14px; margin-top: auto; }
        .testi-avatar-home { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: #f0f8d0; border: 1.5px solid #c8e64c; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .testi-info-home { display: flex; flex-direction: column; }
        .testi-name-home { font-size: 13.5px; font-weight: 800; color: #1a3d2b; }
        .testi-title-home { font-size: 11.5px; color: #6b7c72; }

        @media(max-width: 768px) {
          .testi-card-home { width: 300px; padding: 24px; border-radius: 24px; }
          .testi-text-home { font-size: 13px; }
          .testi-quote-home { font-size: 32px; }
        }
      ` }} />

      <div className="testi-badge-top-home">
        <div className="testi-stars-home">★★★★★</div>
        <div className="testi-rating-text-home uppercase tracking-widest text-xs">Loved by 2000+ Happy Travelers</div>
      </div>

      <div className="testi-container-home">
        {/* Row 1: Right to Left */}
        <div className="testi-row-home rtl">
          {[...testimonials, ...testimonials].map((t, i) => (
            <div key={`rtl-${i}`} className="testi-card-home">
              <div className="testi-quote-home">“</div>
              <p className="testi-text-home">{t.text}</p>
              <div className="testi-footer-home">
                <div className="testi-avatar-home">{t.avatar}</div>
                <div className="testi-info-home">
                  <span className="testi-name-home">{t.name}</span>
                  <span className="testi-title-home">{t.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Left to Right */}
        <div className="testi-row-home ltr">
          {[...testimonials.slice().reverse(), ...testimonials.slice().reverse()].map((t, i) => (
            <div key={`ltr-${i}`} className="testi-card-home">
              <div className="testi-quote-home">“</div>
              <p className="testi-text-home">{t.text}</p>
              <div className="testi-footer-home">
                <div className="testi-avatar-home">{t.avatar}</div>
                <div className="testi-info-home">
                  <span className="testi-name-home">{t.name}</span>
                  <span className="testi-title-home">{t.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerTestimonials;
