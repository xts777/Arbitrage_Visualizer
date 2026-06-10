'use client'; // ReactのHooks（useState等）を使うための宣言

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import type {
  NodeObject,
  LinkObject
} from 'react-force-graph-3d';


const getNodeId = (
  node: string | number | NodeObject | undefined
): string => {
  if (node == null) return '';

  if (typeof node === 'string') return node;

  if (typeof node === 'number') return String(node);

  return String(node.id ?? '');
};


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

  const displayLinks = graphData.links.filter(link => {
    return link.source < link.target;
  });

  return (
    <div className="w-screen h-screen bg-[#0b0f19] m-0 p-0 overflow-hidden relative">
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 999, color: 'white', pointerEvents: 'none' }}>
        <h2 className="text-2xl font-bold mb-2">Arbitrage Visualizer</h2>
        <p>ノード数: {graphData.nodes.length} / エッジ数: {graphData.links.length}</p>
        <p>Hover to see node information</p>
      </div>
      
      {/* 3Dグラフの描画 */}
      <ForceGraph3D
        graphData={{
          nodes: graphData.nodes,
          links: displayLinks
        }}
        nodeLabel="id"
        nodeRelSize={2}
        nodeVal={() => 1}
        nodeColor={() => '#00ffcc'}
        linkColor={() => '#11eeaa'}
        linkOpacity={0.25}
        linkWidth={(link) => {
          if (link.weight > 0) {
            return 1;
          }
          return 0.2;
        }}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        
        linkLabel={(link:any) => {
          const sourceId = getNodeId(link.source);
          const targetId = getNodeId(link.target);

          return `
        ${sourceId} → ${targetId}
        rate: ${link.rate.toFixed(4)}
        weight: ${link.weight.toFixed(4)}
        `;
        }}

        nodeThreeObject={(node) => {
          const sprite = new SpriteText(node.id);
          sprite.color = '#ffffff';
          sprite.backgroundColor = 'transparent';
          sprite.textHeight = 4;
          return sprite;
        }}
        
        
      />
    </div>
  );
}