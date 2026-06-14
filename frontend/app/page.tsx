'use client'; // ReactのHooks（useState等）を使うための宣言

import { useState, useEffect, useRef } from 'react';
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

interface ArbitrageData {
  negative_cycle_nodes: string[];
  arbitrage_cycles: Array<{ cycle: string[], length: number }>;
  has_arbitrage: boolean;
  algorithm?: string;
  execution_time_ms?: number;
}

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [bellmanData, setBellmanData] = useState<ArbitrageData | null>(null);
  const [bellmanEarlyStopData, setBellmanEarlyStopData] = useState<ArbitrageData | null>(null);
  const [spfaData, setSpfaData] = useState<ArbitrageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState<string>('Bellman-Ford (Naive)');
  const [noise, setNoise] = useState<number>(0.0);
  const [fee, setFee] = useState<number>(0.0);
  const fgRef = useRef<any>();

  const fetchMarketData = async (currentNoise: number, currentFee: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/graph?noise=${currentNoise}&fee=${currentFee}`);
      const data = await res.json();
      setGraphData(data);
      // 新規にデータを取得したので、古い計算結果はクリアする
      setBellmanData(null);
      setBellmanEarlyStopData(null);
      setSpfaData(null);
    } catch (err) {
      console.error("API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData(noise, fee);
  }, []);

  const handleBellmanClick = async () => {
    setLoading(true);
    setAlgorithm('Bellman-Ford (Naive)');
    try {
      const res = await fetch(`http://localhost:8000/api/arbitrage`);
      const data = await res.json();
      setBellmanData(data);
      console.log('Bellman-Ford (Naive) data:', data);
    } catch (err) {
      console.error("Arbitrage API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellmanEarlyStopClick = async () => {
    setLoading(true);
    setAlgorithm('Bellman-Ford (Early Stop)');
    try {
      const res = await fetch(`http://localhost:8000/api/arbitrage-early-stop`);
      const data = await res.json();
      setBellmanEarlyStopData(data);
      console.log('Bellman-Ford (Early Stop) data:', data);
    } catch (err) {
      console.error("Early Stop API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSPFAClick = async () => {
    setLoading(true);
    setAlgorithm('SPFA');
    try {
      const res = await fetch(`http://localhost:8000/api/arbitrage-spfa`);
      const data = await res.json();
      setSpfaData(data);
      console.log('SPFA data:', data);
    } catch (err) {
      console.error("SPFA API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 負の閉路に含まれるエッジを判定する関数
  const isNegativeCycleEdge = (link: any): boolean => {
    const activeData =
      algorithm === 'Bellman-Ford (Naive)' ? bellmanData :
        algorithm === 'Bellman-Ford (Early Stop)' ? bellmanEarlyStopData :
          spfaData;
    if (!activeData || activeData.arbitrage_cycles.length === 0) {
      return false;
    }

    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);

    for (const cycle of activeData.arbitrage_cycles) {
      for (let i = 0; i < cycle.cycle.length - 1; i++) {
        if (cycle.cycle[i] === sourceId && cycle.cycle[i + 1] === targetId) {
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link')
        .distance((link: any) => {
          return isNegativeCycleEdge(link) ? 120 : 40;
        })
        .strength((link: any) => {
          return isNegativeCycleEdge(link) ? 1.0 : 0.7;
        });
      fgRef.current.d3Force('charge').strength(-60);
      fgRef.current.d3ReheatSimulation();
    }
  }, [bellmanData, bellmanEarlyStopData, spfaData, graphData, algorithm]);

  return (
    <div className="fixed inset-0 bg-[#0b0f19] m-0 p-0 overflow-hidden">
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 999, color: 'white', pointerEvents: 'none' }}>
        <h2 className="text-2xl font-bold mb-2">Arbitrage Visualizer</h2>
        <p>ノード数: {graphData.nodes.length} / エッジ数: {graphData.links.length}</p>
        <p>Hover to see node information</p>

        {/* コントロールスライダー */}
        <div style={{ marginTop: '15px', pointerEvents: 'auto', backgroundColor: 'rgba(0,0,0,0.7)', padding: '12px', borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
              ノードのノイズ (揺らぎ): {noise.toFixed(1)}%
            </label>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.1"
              value={noise}
              onChange={(e) => setNoise(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
              取引手数料: {fee.toFixed(2)}%
            </label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={fee}
              onChange={(e) => setFee(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={() => fetchMarketData(noise, fee)}
            disabled={loading}
            style={{
              marginTop: '5px',
              padding: '10px',
              background: loading ? '#666' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.0)'; }}
          >
            {loading ? 'Fetching Data...' : 'Fetch & Apply Noise'}
          </button>
        </div>

        {/* 実行結果 & 比較パネル */}
        {(bellmanData || bellmanEarlyStopData || spfaData) && (
          <div style={{ marginTop: '10px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.8)', pointerEvents: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '280px' }}>
            <h4 style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', color: '#fff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>アルゴリズム実行時間比較</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div
                onClick={() => { if (bellmanData) setAlgorithm('Bellman-Ford (Naive)'); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: algorithm === 'Bellman-Ford (Naive)' ? '#ff6b6b' : '#aaa',
                  cursor: bellmanData ? 'pointer' : 'default',
                  fontWeight: algorithm === 'Bellman-Ford (Naive)' ? 'bold' : 'normal',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: algorithm === 'Bellman-Ford (Naive)' ? 'rgba(255,107,107,0.15)' : 'transparent'
                }}
              >
                <span>BF (Naive):</span>
                <span>{bellmanData?.execution_time_ms != null ? `${bellmanData.execution_time_ms.toFixed(4)} ms` : '未実行'}</span>
              </div>
              <div
                onClick={() => { if (bellmanEarlyStopData) setAlgorithm('Bellman-Ford (Early Stop)'); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: algorithm === 'Bellman-Ford (Early Stop)' ? '#ff6b6b' : '#aaa',
                  cursor: bellmanEarlyStopData ? 'pointer' : 'default',
                  fontWeight: algorithm === 'Bellman-Ford (Early Stop)' ? 'bold' : 'normal',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: algorithm === 'Bellman-Ford (Early Stop)' ? 'rgba(255,107,107,0.15)' : 'transparent'
                }}
              >
                <span>BF (Early Stop):</span>
                <span>{bellmanEarlyStopData?.execution_time_ms != null ? `${bellmanEarlyStopData.execution_time_ms.toFixed(4)} ms` : '未実行'}</span>
              </div>
              <div
                onClick={() => { if (spfaData) setAlgorithm('SPFA'); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: algorithm === 'SPFA' ? '#ff6b6b' : '#aaa',
                  cursor: spfaData ? 'pointer' : 'default',
                  fontWeight: algorithm === 'SPFA' ? 'bold' : 'normal',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: algorithm === 'SPFA' ? 'rgba(255,107,107,0.15)' : 'transparent'
                }}
              >
                <span>SPFA:</span>
                <span>{spfaData?.execution_time_ms != null ? `${spfaData.execution_time_ms.toFixed(4)} ms` : '未実行'}</span>
              </div>

              {(() => {
                const runs = [
                  { name: 'Naive', time: bellmanData?.execution_time_ms },
                  { name: 'Early Stop', time: bellmanEarlyStopData?.execution_time_ms },
                  { name: 'SPFA', time: spfaData?.execution_time_ms }
                ].filter(r => r.time != null) as { name: string, time: number }[];

                if (runs.length < 2) return null;

                const sortedRuns = [...runs].sort((a, b) => a.time - b.time);
                const fastest = sortedRuns[0];
                const slowest = sortedRuns[sortedRuns.length - 1];
                const ratio = slowest.time / fastest.time;

                return (
                  <div style={{ borderTop: '1px solid #444', paddingTop: '8px', marginTop: '4px', color: '#6be2ff', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>⚡ 最速: <strong>{fastest.name}</strong> ({fastest.time.toFixed(4)} ms)</span>
                    <span>⚡ 最遅の <strong>{slowest.name}</strong> より <strong style={{ color: '#00ffcc' }}>{ratio.toFixed(1)}倍</strong> 高速</span>
                  </div>
                );
              })()}
            </div>

            {/* 現在選択されているアルゴリズムの閉路検出結果 */}
            {(() => {
              const activeData =
                algorithm === 'Bellman-Ford (Naive)' ? bellmanData :
                  algorithm === 'Bellman-Ford (Early Stop)' ? bellmanEarlyStopData :
                    spfaData;
              if (!activeData) return null;
              return (
                <div style={{ marginTop: '12px', borderTop: '1px solid #444', paddingTop: '8px' }}>
                  <p style={{ color: activeData.has_arbitrage ? '#ff6b6b' : '#00ff00', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                    {activeData.has_arbitrage ? '✓ 負の閉路検出！' : '✗ 負の閉路なし'}
                  </p>
                  {activeData.arbitrage_cycles.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#eee' }}>
                      <p style={{ marginBottom: '4px', color: '#aaa' }}>検出閉路: {activeData.arbitrage_cycles.length}個 (最大3個を表示)</p>
                      {activeData.arbitrage_cycles.slice(0, 3).map((cycle, idx) => (
                        <div key={idx} style={{ color: '#ffaa00', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cycle.cycle.join(' → ')}>
                          {idx + 1}. {cycle.cycle.join(' → ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* アルゴリズム選択・実行ボタン */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 999,
        display: 'flex',
        gap: '10px',
        pointerEvents: 'auto'
      }}>
        <button
          onClick={handleBellmanClick}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#666' : (algorithm === 'Bellman-Ford (Naive)' ? '#ff6b6b' : '#2d3748'),
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
          }}
        >
          {loading && algorithm === 'Bellman-Ford (Naive)' ? 'Analyzing...' : 'BF (Naive)'}
        </button>
        <button
          onClick={handleBellmanEarlyStopClick}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#666' : (algorithm === 'Bellman-Ford (Early Stop)' ? '#ff6b6b' : '#2d3748'),
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
          }}
        >
          {loading && algorithm === 'Bellman-Ford (Early Stop)' ? 'Analyzing...' : 'BF (Early Stop)'}
        </button>
        <button
          onClick={handleSPFAClick}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#666' : (algorithm === 'SPFA' ? '#ff6b6b' : '#2d3748'),
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
          }}
        >
          {loading && algorithm === 'SPFA' ? 'Analyzing...' : 'SPFA'}
        </button>
      </div>

      {/* 3Dグラフの描画 */}
      <ForceGraph3D
        ref={fgRef}
        graphData={{
          nodes: graphData.nodes,
          links: graphData.links
        }}
        nodeLabel="id"
        nodeRelSize={2}
        nodeVal={() => 1}
        nodeColor={() => '#00ffcc'}
        linkColor={(link: any) => {
          if (isNegativeCycleEdge(link)) {
            return '#ff0000'; // 赤色
          }
          return '#11eeaa'; // デフォルト
        }}
        linkOpacity={0.25}
        linkWidth={(link: any) => {
          if (isNegativeCycleEdge(link)) {
            return 3; // 閉路エッジは太く
          }
          if (link.weight > 0) {
            return 1;
          }
          return 0.2;
        }}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={(link: any) => {
          // 双方向エッジがある場合はカーブさせる
          const hasReverse = graphData.links.some(l =>
            getNodeId(l.source) === getNodeId(link.target) &&
            getNodeId(l.target) === getNodeId(link.source)
          );
          return hasReverse ? 0.2 : 0;
        }}

        linkLabel={(link: any) => {
          const sourceId = getNodeId(link.source);
          const targetId = getNodeId(link.target);

          return `
        ${sourceId} → ${targetId}
        rate: ${link.rate.toFixed(4)}
        weight: ${link.weight.toFixed(4)}
        `;
        }}

        nodeThreeObject={(node: any) => {
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