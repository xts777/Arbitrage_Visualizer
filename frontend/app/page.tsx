'use client'; // ReactのHooks（useState等）を使うための宣言

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 【超重要】サーバーサイドレンダリングを無効化して3Dグラフを読み込む
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { 
  ssr: false,
  loading: () => <div className="text-white p-5">Loading 3D Graph...</div>
});

// TypeScript用の型定義
type GraphData = {
  nodes: { id: string }[];
  links: { source: string; target: string; rate: number; weight: number }[];
};

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
      <div className="absolute z-10 p-5 text-white pointer-events-none">
        <h2 className="text-2xl font-bold mb-2">Arbitrage Visualizer</h2>
        <p>ノード数: {graphData.nodes.length} / エッジ数: {graphData.links.length}</p>
      </div>
      
      {/* 3Dグラフの描画 */}
      <ForceGraph3D
        graphData={graphData}
        nodeLabel="id"
        nodeColor={() => '#00ffcc'}
        linkColor={() => '#ffffff55'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
      />
    </div>
  );
}