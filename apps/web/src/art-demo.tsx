import { createRoot } from "react-dom/client";
import { ART_KEYS, Illus } from "./art/Art";
import "./index.css";
function Gallery() {
  return (
    <div className="gutter max-w-[900px] mx-auto py-6">
      <h1 className="font-display text-[30px] mb-4">일러스트 심볼 {ART_KEYS.length}종</h1>
      {(["arkandal", "iruth", "voodoo"] as const).map((f) => (
        <div key={f} className="mb-6">
          <div className="eyebrow mb-2">{f}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
            {ART_KEYS.map((k) => (
              <div key={k} className="bg-panel border border-line rounded p-1.5 grid gap-1 place-items-center">
                <div className="w-12 h-12"><Illus keys={[k]} faction={f} /></div>
                <span className="font-ui text-[9px] text-faint">{k}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Gallery />);
