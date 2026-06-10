import math
from collections import defaultdict

class Edge:
    def __init__(self, src: str, dst: str, rate: float, fee_percent: float = 0.0):
        self.src = src
        self.dst = dst
        self.rate = rate
        actual_rate = rate * (1.0 - fee_percent / 100.0)
        self.weight = -math.log(actual_rate)

class MarketGraph:
    def __init__(self):
        self.nodes = set()
        self.edges = []
        self.adj_list = defaultdict(list)

    def add_exchange_rate(self, src: str, dst: str, rate: float, fee_percent: float = 0.0):
        edge = Edge(src, dst, rate, fee_percent)
        self.nodes.add(src)
        self.nodes.add(dst)
        self.edges.append(edge)
        self.adj_list[src].append(edge)

    def export_for_frontend(self):
        """Reactに渡すためのJSON形式に変換"""
        nodes = [{"id": n} for n in self.nodes]
        links = [{"source": e.src, "target": e.dst, "rate": e.rate, "weight": e.weight} for e in self.edges]
        return {"nodes": nodes, "links": links}