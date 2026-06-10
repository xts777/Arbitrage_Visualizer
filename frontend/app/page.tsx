'use client'; // ReactのHooks（useState等）を使うための宣言

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';

// 【超重要】サーバーサイドレンダリングを無効化して3Dグラフを読み込む
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { 
  ssr: false,
  loading: () => <div className="text-white p-5">Loading 3D Graph...</div>
});

type Coords = {
  x: number;
  y: number;
  z: number;
};
interface Link {
  source: string;
  target: string;
  rate: number;
  weight: number;
}
interface GraphData {
  nodes: { id: string }[];
  links: Link[];
}

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    // バックエンド（FastAPI: ポート8000）からデータを取得
    fetch('http://localhost:8000/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(err => console.error("API Error:", err));
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0b0f19] m-0 p-0 overflow-hidden relative">
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 999, color: 'white', pointerEvents: 'none' }}>
        <h2 className="text-2xl font-bold mb-2">Arbitrage Visualizer</h2>
        <p>ノード数: {graphData.nodes.length} / エッジ数: {graphData.links.length}</p>
        <p>Hover to see node information</p>
      </div>
      
      {/* 3Dグラフの描画 */}
      <ForceGraph3D
        graphData={graphData}
        nodeLabel="id"
        nodeColor={() => '#00ffcc'}
        linkColor={() => '#11eeaa'}
        linkWidth={0.4}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}

        linkThreeObjectExtend={true}

        linkThreeObject={(link: Link) => {
          const sprite = new SpriteText(`${link.rate}`);
          sprite.color = 'lightgray';
          sprite.textHeight = 1.5;
          return sprite;
        }}
        linkPositionUpdate={(
          sprite: SpriteText & { position: Coords },
          { start, end }: { start: Coords; end: Coords }
        ) => {
          const middlePos: Coords = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2,
            z: start.z + (end.z - start.z) / 2,
          };
          Object.assign(sprite.position, middlePos);
        }}
      />
    </div>
  );
}