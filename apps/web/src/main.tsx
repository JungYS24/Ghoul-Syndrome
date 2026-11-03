import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useGame } from "./store/store";
import { Title } from "./ui/Title";
import { Game } from "./ui/Game";
import { Ending } from "./ui/Ending";
import { DiceOverlay } from "./ui/DiceOverlay";
import "./index.css";

function App() {
  const screen = useGame((z) => z.screen);
  const state = useGame((z) => z.state);
  const init = useGame((z) => z.init);
  useEffect(() => { void init(); }, [init]);
  return (
    <>
      {screen === "title" && <Title />}
      {screen === "game" && state && <Game s={state} />}
      {screen === "ending" && state && <Ending s={state} />}
      <DiceOverlay />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
