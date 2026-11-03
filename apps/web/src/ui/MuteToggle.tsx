import { useEffect, useState } from "react";
import { isMuted, onMuteChange, setMuted } from "../audio/sfx";
export function MuteToggle() {
  const [m, setM] = useState(isMuted());
  useEffect(() => onMuteChange(setM), []);
  return <button className="btn" aria-pressed={m} onClick={() => setMuted(!m)}>{m ? "소리 꺼짐" : "소리 켜짐"}</button>;
}
