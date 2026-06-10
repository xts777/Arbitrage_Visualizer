from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from market_graph import MarketGraph

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
def get_graph_data():
    market = MarketGraph()
    # テスト用のダミーデータを投入
    market.add_exchange_rate("JPY", "USD", 0.0066)
    market.add_exchange_rate("USD", "EUR", 0.93)
    market.add_exchange_rate("EUR", "JPY", 165.0)
    market.add_exchange_rate("JPY", "BTC", 0.0000001)
    market.add_exchange_rate("BTC", "USD", 65000.0)
    
    return market.export_for_frontend()