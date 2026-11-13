import { useEffect, useRef, useState } from "react";

/** 값이 바뀌면 잠깐 "up"/"down" 을 돌려줍니다 (자원·게이지 숫자 깜빡임용). good=false 면 오름이 나쁜 쪽(감염도·진노). */
export function useFlash(value: number, good = true): "" | "up" | "down" {
  const prev = useRef(value);
  const [f, setF] = useState<"" | "up" | "down">("");
  useEffect(() => {
    if (value === prev.current) return;
    const up = value > prev.current;
    prev.current = value;
    setF(up === good ? "up" : "down");
    const t = setTimeout(() => setF(""), 1400);
    return () => clearTimeout(t);
  }, [value, good]);
  return f;
}
