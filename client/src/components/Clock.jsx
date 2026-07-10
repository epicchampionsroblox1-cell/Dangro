import React, { useState, useEffect } from "react";

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const mins = time.getMinutes().toString().padStart(2, "0");

  return <span className="clock">{hours}:{mins}</span>;
}
