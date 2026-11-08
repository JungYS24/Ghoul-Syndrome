import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useGame } from "./store/store";
import { Title } from "./ui/Title";
import { Game } from "./ui/Game";
import { Ending } from "./ui/Ending";
import { DiceOverlay } from "./ui/DiceOverlay";
import { playBgm } from "./audio/bgm";
import "./index.css";
import "./theme.css";
import { Atmosphere } from "./ui/Atmosphere";

function App() {
  const screen = useGame((z) => z.screen);
  const state = useGame((z) => z.state);
  const init = useGame((z) => z.init);
  const faction = state?.faction;
  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    if (screen === "title") playBgm("lobby");
    else if (faction) playBgm(faction);
  }, [screen, faction]);
  return (
    <>
      {screen === "title" && <Title />}
      {screen === "game" && state && <Game s={state} />}
      {screen === "ending" && state && <Ending s={state} />}
      <Atmosphere />
      <DiceOverlay />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
