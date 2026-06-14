def bellman_ford(start_node, adj_list, early_stop=False):
    """
    Bellman-Fordアルゴリズム：負の辺とも対応
    start_node: 始点
    adj_list: { 'A': [('B', 2), ('C', 5)], ... } のような隣接リスト
    early_stop: 緩和が発生しなくなった時点で早期終了するかどうか
    
    Returns: (distances, parent, has_negative_cycle, negative_cycle_nodes)
    """
    # 初期化
    nodes = list(adj_list.keys())
    distances = {node: float('inf') for node in nodes}
    parent = {node: None for node in nodes}
    distances[start_node] = 0
    
    for _ in range(len(nodes) - 1):
        updated = False
        for u in nodes:
            if distances[u] == float('inf'):
                continue
            for v, weight in adj_list[u]:
                if distances[u] + weight < distances[v] - 1e-9: # 浮動小数点誤差を考慮
                    distances[v] = distances[u] + weight
                    parent[v] = u
                    updated = True
        if early_stop and not updated:
            break
    
    # Check for negative cycle
    has_negative_cycle = False
    negative_cycle_nodes = set()
    
    for u in nodes:
        if distances[u] == float('inf'):
            continue
        for v, weight in adj_list[u]:
            if distances[u] + weight < distances[v] - 1e-9: # 浮動小数点誤差を考慮
                has_negative_cycle = True
                negative_cycle_nodes.add(v)
    
    return distances, parent, has_negative_cycle, negative_cycle_nodes

def trace_negative_cycle_via_parent(start_node, parent, all_nodes):
    """
    parentリンクを辿って負の閉路を復元する
    """
    curr = start_node
    # ノード数分 parent を遡り、確実に閉路内のノードに到達させる
    for _ in range(len(all_nodes)):
        if curr in parent and parent[curr] is not None:
            curr = parent[curr]
        else:
            return None
            
    # 閉路を一周する
    cycle = []
    visited = set()
    while curr not in visited:
        visited.add(curr)
        cycle.append(curr)
        if curr in parent and parent[curr] is not None:
            curr = parent[curr]
        else:
            return None
            
    cycle.append(curr)
    return cycle[::-1] # 順方向に直す

def find_negative_cycles(adj_list, early_stop=False):
    """
    グラフ内の最初の負の閉路を見つけ、具体的なパス（リスト）のリスト（要素数1）を返す
    """
    all_nodes = list(adj_list.keys())
    
    for start_node in all_nodes:
        distances, parent, has_cycle, cycle_nodes = bellman_ford(start_node, adj_list, early_stop=early_stop)
        if has_cycle:
            for node in cycle_nodes:
                cycle = trace_negative_cycle_via_parent(node, parent, all_nodes)
                if cycle:
                    return [cycle]
    return []

def trace_negative_cycle(start_node, adj_list):
    all_nodes = list(adj_list.keys())
    distances, parent, has_cycle, cycle_nodes = bellman_ford(start_node, adj_list)
    if has_cycle:
        for node in cycle_nodes:
            cycle = trace_negative_cycle_via_parent(node, parent, all_nodes)
            if cycle:
                return cycle
    return None
