import requests
import random
from market_graph import MarketGraph

# TARGET_FIAT = ["USD", "JPY", "EUR", "GBP", "AUD", "CAD", "CHF"]
TARGET_FIAT = [
    "USD", "JPY", "EUR", "GBP", "AUD", "CAD", "CHF", "NZD", "SEK", "NOK",
    # "DKK", "CZK", "PLN", "HUF", "RON", "BGN", "TRY", "CNY", "HKD", "SGD", 
    # "KRW", "INR", "IDR", "MYR", "PHP", "THB", "ZAR", "BRL", "MXN", "ILS"
]

def load_base_market_data(fee_percent: float = 0.0, noise_percent: float = 0.0) -> MarketGraph:
    """Frankfurter APIからデータを取得し、グラフを構築する"""
    market = MarketGraph()
    
    try:
        print("Frankfurter APIからデータを取得中...")
        url = "https://api.frankfurter.dev/v1/latest?base=USD"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        rates = data["rates"]
        rates["USD"] = 1.0
        
        for base in TARGET_FIAT:
            for quote in TARGET_FIAT:
                if base == quote:
                    continue
                
                if base not in rates or quote not in rates:
                    continue
                
                cross_rate = rates[quote] / rates[base]
                if noise_percent > 0.0:
                    # ノイズ付与
                    factor = 1.0 + random.uniform(-noise_percent, noise_percent) / 100.0
                    cross_rate *= factor
                
                market.add_exchange_rate(base, quote, cross_rate, fee_percent)
                
        print(f"データ取得完了: {len(market.nodes)}ノード, {len(market.edges)}エッジ")
                
    except Exception as e:
        print(f"データ取得エラー: {e}")
        
    return market