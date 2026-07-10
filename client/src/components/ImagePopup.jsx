import React, { useEffect } from "react";

export default function ImagePopup({ src, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="image-popup-overlay" onClick={onClose}>
      <div className="image-popup-content" onClick={e => e.stopPropagation()}>
        <button className="image-popup-close" onClick={onClose}>&times;</button>
        <img src={src} alt="Popup" />
      </div>
    </div>
  );
}
