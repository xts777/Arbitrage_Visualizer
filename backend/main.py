from bellman import bellman_ford, find_negative_cycles
from spfa import find_negative_cycles_spfa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from data_loader import load_base_market_data
import time

def normalize_cycle(cycle):
    """
    閉路を正規化する（最小の回転を選ぶ）
    末尾の重複ノードを除いて、最小辞書順の回転を選ぶ
    """
    if not cycle or len(cycle) < 2:
        return None
    
    core = cycle[:-1]
    if len(core) == 0:
        return None
    
    rotations = [tuple(core[i:] + core[:i]) for i in range(len(core))]
    canonical = min(rotations)
    return list(canonical)

def deduplicate_cycles(cycles):
    """重複を排除して、ユニークな閉路のみを返す"""
    seen = set()
    unique_cycles = []
    
    for cycle in cycles:
        normalized = normalize_cycle(cycle)
        if normalized:
            canonical_tuple = tuple(normalized)
            if canonical_tuple not in seen:
                seen.add(canonical_tuple)
                unique_cycles.append(cycle)
    
    return unique_cycles

def get_cycle_weight(cycle, adj_list):
    """サイクルの総ウェイト（重みの合計）を計算する"""
    if not cycle or len(cycle) < 2:
        return 0.0
    
    total_weight = 0.0
    for i in range(len(cycle) - 1):
        u = cycle[i]
        v = cycle[i + 1]
        
        # u -> v のエッジの重みを探す
        found = False
        if u in adj_list:
            for neighbor, weight in adj_list[u]:
                if neighbor == v:
                    total_weight += weight
                    found = True
                    break
        if not found:
            return float('inf') # エッジが見つからない場合は無効
            
    return total_weight

# グローバル市場データキャッシュ
current_market = None

app = FastAPI()

# CORS設定（Reactのポート5173からのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/graph")
def get_graph_data(noise: float = 0.0, fee: float = 0.0):
    global current_market
    current_market = load_base_market_data(fee_percent=fee, noise_percent=noise)
    return current_market.export_for_frontend()

@app.get("/api/arbitrage")
def find_arbitrage():
    """負の閉路（アービトラージチャンス）を見つける"""
    global current_market
    if current_market is None:
        current_market = load_base_market_data(fee_percent=0.0, noise_percent=0.0)
    
    market = current_market
    
    # MarketGraphのadj_listをダイクストラ用の形式に変換
    # adj_list: { 'USD': [('JPY', weight), ...], ... }
    adj_list_for_dijkstra = {}
    for src in market.adj_list:
        adj_list_for_dijkstra[src] = [(edge.dst, edge.weight) for edge in market.adj_list[src]]
    
    # 全ノードを追加（孤立したノードも含める）
    for node in market.nodes:
        if node not in adj_list_for_dijkstra:
            adj_list_for_dijkstra[node] = []
    
    # 10回実行して平均時間を計測
    NUM_RUNS = 100
    start_time = time.perf_counter()
    for _ in range(NUM_RUNS):
        detected_cycles = find_negative_cycles(adj_list_for_dijkstra, early_stop=False)
    end_time = time.perf_counter()
    execution_time_ms = ((end_time - start_time) * 1000.0) / NUM_RUNS
    # 浮動小数点誤差を排除するため、サイクルの総重量が明確に負（-1e-7未満）か検証
    raw_cycles = [cycle for cycle in detected_cycles if get_cycle_weight(cycle, adj_list_for_dijkstra) < -1e-7]
    
    # 重複を排除
    unique_cycles = deduplicate_cycles(raw_cycles)
    
    arbitrage_cycles = [
        {
            "cycle": cycle,
            "length": len(cycle) - 1  # 最後は最初と同じなので
        }
        for cycle in unique_cycles
    ]
    
    print(f"Found {len(raw_cycles)} cycles, {len(arbitrage_cycles)} unique")
    
    return {
        "negative_cycle_nodes": list(set([n for c in unique_cycles for n in c])), # フィルタ済みのノード
        "arbitrage_cycles": arbitrage_cycles,
        "has_arbitrage": len(unique_cycles) > 0,
        "algorithm": "Bellman-Ford (Naive)",
        "execution_time_ms": execution_time_ms
    }

@app.get("/api/arbitrage-early-stop")
def find_arbitrage_early_stop():
    """負の閉路（アービトラージチャンス）を早期終了付きBellman-Fordで見つける"""
    global current_market
    if current_market is None:
        current_market = load_base_market_data(fee_percent=0.0, noise_percent=0.0)
    
    market = current_market
    
    adj_list_for_dijkstra = {}
    for src in market.adj_list:
        adj_list_for_dijkstra[src] = [(edge.dst, edge.weight) for edge in market.adj_list[src]]
    
    for node in market.nodes:
        if node not in adj_list_for_dijkstra:
            adj_list_for_dijkstra[node] = []
    
    # 10回実行して平均時間を計測
    NUM_RUNS = 100
    start_time = time.perf_counter()
    for _ in range(NUM_RUNS):
        detected_cycles = find_negative_cycles(adj_list_for_dijkstra, early_stop=True)
    end_time = time.perf_counter()
    execution_time_ms = ((end_time - start_time) * 1000.0) / NUM_RUNS
    # 浮動小数点誤差を排除するため、サイクルの総重量が明確に負（-1e-7未満）か検証
    raw_cycles = [cycle for cycle in detected_cycles if get_cycle_weight(cycle, adj_list_for_dijkstra) < -1e-7]
    
    # 重複を排除
    unique_cycles = deduplicate_cycles(raw_cycles)
    
    arbitrage_cycles = [
        {
            "cycle": cycle,
            "length": len(cycle) - 1
        }
        for cycle in unique_cycles
    ]
    
    print(f"Early Stop: Found {len(raw_cycles)} cycles, {len(arbitrage_cycles)} unique")
    
    return {
        "negative_cycle_nodes": list(set([n for c in unique_cycles for n in c])),
        "arbitrage_cycles": arbitrage_cycles,
        "has_arbitrage": len(unique_cycles) > 0,
        "algorithm": "Bellman-Ford (Early Stop)",
        "execution_time_ms": execution_time_ms
    }

@app.get("/api/arbitrage-spfa")
def find_arbitrage_spfa():
    """負の閉路（アービトラージチャンス）をSPFAで見つける"""
    global current_market
    if current_market is None:
        current_market = load_base_market_data(fee_percent=0.0, noise_percent=0.0)
    
    market = current_market
    for edge in market.edges:
        print(edge.src, edge.dst, edge.weight)
    
    # MarketGraphのadj_listをSPFA用の形式に変換
    adj_list_for_spfa = {}
    for src in market.adj_list:
        adj_list_for_spfa[src] = [(edge.dst, edge.weight) for edge in market.adj_list[src]]
    
    # 全ノードを追加（孤立したノードも含める）
    for node in market.nodes:
        if node not in adj_list_for_spfa:
            adj_list_for_spfa[node] = []
    
    # 10回実行して平均時間を計測
    NUM_RUNS = 100
    start_time = time.perf_counter()
    for _ in range(NUM_RUNS):
        detected_cycles = find_negative_cycles_spfa(adj_list_for_spfa)
    end_time = time.perf_counter()
    execution_time_ms = ((end_time - start_time) * 1000.0) / NUM_RUNS
    # 浮動小数点誤差を排除するため、サイクルの総重量が明確に負（-1e-7未満）か検証
    raw_cycles = [cycle for cycle in detected_cycles if get_cycle_weight(cycle, adj_list_for_spfa) < -1e-7]
    
    # 重複を排除
    unique_cycles = deduplicate_cycles(raw_cycles)
    
    arbitrage_cycles = [
        {
            "cycle": cycle,
            "length": len(cycle) - 1  # 最後は最初と同じなので
        }
        for cycle in unique_cycles
    ]
    
    print(f"SPFA: Found {len(raw_cycles)} cycles, {len(arbitrage_cycles)} unique")
    
    return {
        "negative_cycle_nodes": list(set([n for c in unique_cycles for n in c])), # フィルタ済みのノード
        "arbitrage_cycles": arbitrage_cycles,
        "has_arbitrage": len(unique_cycles) > 0,
        "algorithm": "SPFA",
        "execution_time_ms": execution_time_ms
    }