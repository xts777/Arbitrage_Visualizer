from collections import deque
from bellman import trace_negative_cycle_via_parent

def spfa(start_node, adj_list, max_iterations=None):
    """
    SPFA (Shortest Path Faster Algorithm) - 負の辺に対応
    Bellman-Fordよりも高速に負の閉路を検出できる
    
    start_node: 始点
    adj_list: { 'A': [('B', 2), ('C', 5)], ... } のような隣接リスト
    max_iterations: 最大反復回数（デフォルトはノード数）
    
    Returns: (distances, parent, has_negative_cycle, negative_cycle_nodes)
    """
    nodes = list(adj_list.keys())
    if max_iterations is None:
        max_iterations = len(nodes)
    
    # 初期化
    distances = {node: float('inf') for node in nodes}
    parent = {node: None for node in nodes}
    in_queue = {node: False for node in nodes}
    visit_count = {node: 0 for node in nodes}
    
    distances[start_node] = 0
    queue = deque([start_node])
    in_queue[start_node] = True
    visit_count[start_node] = 1
    
    while queue:
        u = queue.popleft()
        in_queue[u] = False
        
        # 隣接ノードをチェック
        if u in adj_list:
            for v, weight in adj_list[u]:
                if distances[u] + weight < distances[v] - 1e-9: # 浮動小数点誤差を考慮
                    distances[v] = distances[u] + weight
                    parent[v] = u
                    visit_count[v] += 1
                    
                    # ノードが何度もキューに入った = 負の閉路の可能性
                    if visit_count[v] > max_iterations:
                        has_negative_cycle = True
                        return distances, parent, has_negative_cycle, {v}
                    
                    if not in_queue[v]:
                        queue.append(v)
                        in_queue[v] = True
    
    # 負の閉路がない
    return distances, parent, False, set()

def find_negative_cycles_spfa(adj_list):
    """
    グラフ内の最初の負の閉路をSPFAで見つけ、具体的なパス（リスト）のリスト（要素数1）を返す
    """
    all_nodes = list(adj_list.keys())
    
    for start_node in all_nodes:
        distances, parent, has_cycle, cycle_nodes = spfa(start_node, adj_list)
        if has_cycle:
            for node in cycle_nodes:
                cycle = trace_negative_cycle_via_parent(node, parent, all_nodes)
                if cycle:
                    return [cycle]
    return []


if __name__ == "__main__":
    # テストケース
    test_graph = {
        'A': [('B', 1)],
        'B': [('C', -3)],
        'C': [('A', 1)]
    }
    
    print("SPFA Test (negative cycle):")
    distances, parent, has_cycle, cycle_nodes = spfa('A', test_graph)
    print(f"Negative cycle detected: {has_cycle}")
    print(f"Cycle nodes: {cycle_nodes}")
    
    print("\nMulti-source SPFA test:")
    cycle_nodes = find_negative_cycles_spfa(test_graph)
    print(f"Negative cycle nodes: {cycle_nodes}")
