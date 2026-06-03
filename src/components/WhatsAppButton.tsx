import React from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useLocation } from "react-router-dom";

const WhatsAppButton = () => {
  const { hasResponded } = useCookieConsent();
  const location = useLocation();

  // Hide the Chat with us widget on all admin dashboard pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

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

