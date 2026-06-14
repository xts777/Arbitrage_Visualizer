# Arbitrage Visualizer (アービトラージ可視化ツール)

為替レート市場のグラフから負の閉路（アービトラージ機会）を検出し、3Dグラフとして可視化するWebアプリケーションです。
また、3種類のアルゴリズム（Bellman-Ford Naive, Bellman-Ford Early Stop, SPFA）の実行時間を測定・比較する実験スクリプトも含まれています。

## 構成

- **backend/**: FastAPI (Python 3.12+) を使用したバックエンドサーバー。為替レートの取得、グラフ構築、アービトラージ検出アルゴリズムを実行します。
- **frontend/**: Next.js / React (TypeScript) を使用したフロントエンド。3D Force Graphを用いて市場の接続と検出された閉路をビジュアル化します。

---

## バックエンドのセットアップ & 起動方法

バックエンドは Python の仮想環境 (`venv`) を使用して動作させます。

### 1. 仮想環境の作成とアクティベート
`backend/` ディレクトリに移動し、仮想環境を構築します。

**Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2. 依存関係のインストール
仮想環境がアクティベートされた状態で、必要なライブラリをインストールします。
```bash
pip install -r requirements.txt
```

### 3. サーバーの起動
FastAPIのWebサーバーを起動します。
```bash
uvicorn main:app --reload --port 8000
```
サーバーは `http://localhost:8000` で待機状態になります。

---

## フロントエンドのセットアップ & 起動方法

フロントエンドは Node.js 環境が必要です。

### 1. 依存関係のインストール
`frontend/` ディレクトリに移動し、パッケージをインストールします。
```bash
cd frontend
npm install
```

### 2. 開発サーバーの起動
ローカルの開発サーバーを立ち上げます。
```bash
npm run dev
```
起動後、ブラウザで `http://localhost:3000` にアクセスすると、可視化画面が表示されます。

---

## 実験スクリプト（アルゴリズム比較）の実行方法

ノイズ割合（`0%`, `0.5%`, `1%`, `2%`）を変えながら、3つのアルゴリズムの実行時間を比較測定し、結果をグラフにプロットする実験スクリプトが用意されています。

### 実行手順
1. バックエンドの仮想環境をアクティベートします（上記バックエンドの手順を参照）。
2. `backend/` ディレクトリで以下のスクリプトを実行します。
   ```powershell
   python run_experiment.py
   ```
3. 実行が完了すると、コンソールに各ノイズレベルでの平均実行時間が出力され、プロット結果が `backend/execution_time_comparison.png` として保存されます。

---

## 実装されているアルゴリズム
- **Bellman-Ford (Naive)**: 最短経路の更新が発生しなくなっても $|V|-1$ 回ループを回し続ける実装。
- **Bellman-Ford (Early Stop)**: ループ中に一度も更新が発生しなかった時点で処理を終了する実装。
- **SPFA (Shortest Path Faster Algorithm)**: キューを使用して更新が必要なノードのみを順次処理する実装。

---

## 仕様・カスタマイズ方法

### 1. 為替データのノイズ（揺らぎ）付与について
市場データのロード時に、現実の市場変動やアービトラージ機会をシミュレートする目的で、取得した基本レートに対してランダムなノイズ（揺らぎ）を付与することができます。
- バックエンドの API (`/api/graph?noise=X`) や、実験スクリプト `run_experiment.py` におけるノイズ割合（%）がこれに対応します。
- 例えば、ノイズ割合が `1.0%` の場合、元のクロスレートに対して $\pm 1.0\%$ の範囲でランダムに変動させた値をエッジの重み（$- \log(\text{レート})$）の計算に使用します。

### 2. 対象通貨の変更（カスタマイズ）
シミュレーション対象とする通貨（ノード）は、バックエンド側で固定されています。
可視化または実験の対象通貨を変更・追加したい場合は、以下のファイルを直接編集してください。

- **対象ファイル**: [backend/data_loader.py](backend/data_loader.py)
- **変更箇所**: `TARGET_FIAT` 定数（[backend/data_loader.py#L6-L10](backend/data_loader.py#L6-L10)）
  ```python
  TARGET_FIAT = [
      "USD", "JPY", "EUR", "GBP", "AUD", "CAD", "CHF", "NZD", "SEK", "NOK",
      # 必要に応じて他の通貨（"CNY", "SGD" など）をリストに追加、または不要な通貨をコメントアウトしてください。
  ]
  ```


