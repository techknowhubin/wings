import React from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

const WhatsAppButton = () => {
  const { hasResponded } = useCookieConsent();

  return (
    <a
      href="https://wa.me/919492986412?text=Hi%2C%20I%20have%20a%20question%20about%20Xplorwing"
      className={`wa${!hasResponded ? " wa--shifted" : ""}`}
      target="_blank"
      rel="noreferrer"
    >
      <span className="wa-ic">💬</span>
      <span>Chat with us</span>
    </a>
  );
};

export default WhatsAppButton;
