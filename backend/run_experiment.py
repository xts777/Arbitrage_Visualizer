import time
import random
import matplotlib.pyplot as plt
from data_loader import load_base_market_data
from bellman import find_negative_cycles
from spfa import find_negative_cycles_spfa

def run_experiment():
    noises = [0.0, 0.5, 1.0, 2.0]
    num_runs = 100
    
    results = {
        "Bellman-Ford (Naive)": [],
        "Bellman-Ford (Early Stop)": [],
        "SPFA": []
    }
    
    print("=" * 60)
    print("アービトラージ検出アルゴリズム実行時間測定実験")
    print("=" * 60)
    
    for noise in noises:
        print(f"\n--- ノイズの割合: {noise}% ---")
        
        market = load_base_market_data(fee_percent=0.0, noise_percent=noise)
        
        # transform data to adjency class
        adj_list = {}
        for src in market.adj_list:
            adj_list[src] = [(edge.dst, edge.weight) for edge in market.adj_list[src]]
        for node in market.nodes:
            if node not in adj_list:
                adj_list[node] = []
                
        # 1. Bellman-Ford (Naive)
        print("Bellman-Ford (Naive) を測定中...")
        start = time.perf_counter()
        for _ in range(num_runs):
            _ = find_negative_cycles(adj_list, early_stop=False)
        end = time.perf_counter()
        bf_naive_time = ((end - start) * 1000.0) / num_runs
        results["Bellman-Ford (Naive)"].append(bf_naive_time)
        print(f"  平均実行時間: {bf_naive_time:.4f} ms")
        
        # 2. Bellman-Ford (Early Stop)
        print("Bellman-Ford (Early Stop) を測定中...")
        start = time.perf_counter()
        for _ in range(num_runs):
            _ = find_negative_cycles(adj_list, early_stop=True)
        end = time.perf_counter()
        bf_early_time = ((end - start) * 1000.0) / num_runs
        results["Bellman-Ford (Early Stop)"].append(bf_early_time)
        print(f"  平均実行時間: {bf_early_time:.4f} ms")
        
        # 3. SPFA
        print("SPFA を測定中...")
        start = time.perf_counter()
        for _ in range(num_runs):
            _ = find_negative_cycles_spfa(adj_list)
        end = time.perf_counter()
        spfa_time = ((end - start) * 1000.0) / num_runs
        results["SPFA"].append(spfa_time)
        print(f"  平均実行時間: {spfa_time:.4f} ms")
        
    print("\n実験完了！結果をプロットします...")
    
    plt.figure(figsize=(10, 6))
    plt.style.use('seaborn-v0_8-whitegrid')

    plt.plot(noises, results["Bellman-Ford (Naive)"], marker='o', linewidth=2.5, markersize=8, label="Bellman-Ford (Naive)", color="#e74c3c")
    plt.plot(noises, results["Bellman-Ford (Early Stop)"], marker='s', linewidth=2.5, markersize=8, label="Bellman-Ford (Early Stop)", color="#f39c12")
    plt.plot(noises, results["SPFA"], marker='^', linewidth=2.5, markersize=8, label="SPFA", color="#2ecc71")
    
    plt.title("Arbitrage Detection Algorithm Comparison", fontsize=14, fontweight='bold', pad=15)
    plt.xlabel("Noise Level (%)", fontsize=12, labelpad=10)
    plt.ylabel("Average Execution Time (ms)", fontsize=12, labelpad=10)
    plt.xticks(noises)
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.legend(fontsize=11, loc="upper left", frameon=True, facecolor="white", edgecolor="none")
    
    plt.tight_layout()
    
    output_filename = "execution_time_comparison.png"
    plt.savefig(output_filename, dpi=300)
    print(f"プロット画像を保存しました: {output_filename}")
    
    plt.close()

if __name__ == "__main__":
    run_experiment()
