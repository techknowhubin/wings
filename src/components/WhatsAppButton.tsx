import React from "react";

const WhatsAppButton = () => {
  return (
    <a
      href="https://wa.me/919422799420?text=Hi%2C%20I%20have%20a%20question%20about%20Xplorwing"
      className="wa"
      target="_blank"
      rel="noreferrer"
    >
      <span className="wa-ic">💬</span>
      <span>Chat with us</span>
    </a>
  );
};

export default WhatsAppButton;
