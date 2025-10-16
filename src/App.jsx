import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// --- visuals to match the reference
const SIZE = 110; 
const PAD = 24;

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function useWindowSize() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onR = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return s;
}

export default function App() {
  const { w, h } = useWindowSize();

  // nodes: {id(#), parentId?, x, y}
  const [nodes, setNodes] = useState(() => {
    return [
      {
        id: 0,
        x: rnd(PAD, Math.max(PAD, window.innerWidth - SIZE - PAD)),
        y: rnd(PAD, Math.max(PAD, window.innerHeight - SIZE - PAD)),
      },
    ];
  });

  const byId = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  // dragging
  const drag = useRef(null); 
  const onMouseDown = useCallback(
    (e, id) => {
      const n = byId.get(id);
      if (!n) return;
      drag.current = { id, dx: e.clientX - n.x, dy: e.clientY - n.y };
      e.preventDefault();
    },
    [byId]
  );

  useEffect(() => {
    const move = (e) => {
      if (!drag.current) return;
      const { id, dx, dy } = drag.current;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                x: Math.min(Math.max(PAD, e.clientX - dx), window.innerWidth - SIZE - PAD),
                y: Math.min(Math.max(PAD, e.clientY - dy), window.innerHeight - SIZE - PAD),
              }
            : n
        )
      );
    };
    const up = () => (drag.current = null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // add child
  const addChild = (parentId) => {
    setNodes((prev) => [
      ...prev,
      {
        id: prev.length, 
        parentId,
        x: rnd(PAD, Math.max(PAD, w - SIZE - PAD)),
        y: rnd(PAD, Math.max(PAD, h - SIZE - PAD)),
      },
    ]);
  };

  // parent bottom-center -> midY -> child top-center
  const edges = useMemo(() => {
    return nodes
      .filter((n) => n.parentId !== undefined)
      .map((child) => {
        const parent = byId.get(child.parentId);
        if (!parent) return null;

        const pBottomX = parent.x + SIZE / 2;
        const pBottomY = parent.y + SIZE;
        const cTopX = child.x + SIZE / 2;
        const cTopY = child.y;

        const midY = (pBottomY + cTopY) / 2; 
        const pts = [
          [pBottomX, pBottomY],
          [pBottomX, midY],
          [cTopX, midY],
          [cTopX, cTopY],
        ];
        return { key: `${parent.id}->${child.id}`, pts };
      })
      .filter(Boolean);
  }, [nodes, byId]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-pink-100">
      {/* connector layer */}
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
        {edges.map(({ key, pts }) => (
          <polyline
            key={key}
            points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
        ))}
      </svg>

      {/* blocks */}
      {nodes.map((n) => (
        <Block key={n.id} node={n} onMouseDown={onMouseDown} onAdd={() => addChild(n.id)} />
      ))}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-black/60">
        Drag blocks • Click <span className="font-semibold">+</span> to add a child
      </div>
    </div>
  );
}

function Block({ node, onMouseDown, onAdd }) {
  return (
    <div
      style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
      className="absolute select-none"
    >
      <div
        onMouseDown={(e) => onMouseDown(e, node.id)}
        className="w-[110px] h-[110px] rounded-md bg-pink-600 shadow-lg shadow-black/20 border-2 border-pink-700 flex flex-col items-center justify-between cursor-move"
      >
        <div className="w-full text-center pt-3 text-white font-semibold">{node.id}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="w-[80%] mb-3 h-8 bg-pink-200 text-pink-700 font-bold rounded-sm hover:opacity-90"
          title="Add child"
        >
          +
        </button>
      </div>
    </div>
  );
}
