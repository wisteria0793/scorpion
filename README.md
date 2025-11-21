# 民泊業務管理サイトの開発

## 目的
- 現在、webサイトやスマートチェックインシステムに掲載している情報が個別で管理されているため、施設情報等を一元管理
- 来年度2026年4月から宿泊税が導入されるため、予約情報と支払い状況を連携
- 売り上げ状況を可視化し、年度内の売り上げ状況、昨年度同時期との比較を容易にし、次の施策を行える手助けをする
- 予約可能かどうかを毎度Beds24にアクセスしていたため、こちらで管理することでログインの手間を減らし、また、モバイルデバイスからも操作できるようなUI/UXを作成する
- 宿泊者名簿の提出を確認し、チェックインシステムと連携し、未提出であれば提出するよう案内を行う


## 開発環境
- フロントエンド: React
- バックエンド: Django
- 通知機能: Slack API(チェックイン・アウトの即時通知、当日の予約管理、新規予約の通知、宿泊税の支払い通知など)
- サーバ: Xサーバ VPS(すでに利用しているため)

## 開発期間
- 現時点(2025.11.21) ~ 2026.03.31をめどに開発

## 機能一覧
- ログイン・ユーザ登録
- 年度売り上げ状況、月刊売り上げ状況の可視化
- 施設情報登録・変更・削除
- GCPのスプレッドシートに関するAPIから、宿泊者名簿の取得
- Stripeの決済成立を確認し、宿泊予約に宿泊税の支払い状況・名簿提出状況を連携・確認
- 特定の日に対し、宿泊の可否を設定可能にする

## データベース設計
詳細なデータベース設計（テーブル定義、ER図）は以下のファイルで管理しています。

- [データベース設計](./docs/database_design.md)

## APIエンドポイント

### 認証 (`/api/auth/`)
- `POST /api/auth/register/`
  - **説明:** 新規ユーザー登録
  - **リクエストボディ:** `{ "username": "user", "email": "user@example.com", "password": "password" }`
  - **レスポンス:** `{ "user": { "id": 1, "username": "user", "email": "user@example.com" } }`

- `POST /api/auth/login/`
  - **説明:** ログイン
  - **リクエストボディ:** `{ "email": "user@example.com", "password": "password" }`
  - **レスポンス:** `{ "access_token": "your_jwt_token_here" }`

- `POST /api/auth/logout/`
  - **説明:** ログアウト (トークンを無効化)
  - **レスポンス:** `204 No Content`

### 施設 (`/api/facilities/`)
- `GET /api/facilities/`
  - **説明:** 全ての施設リストを取得
- `POST /api/facilities/`
  - **説明:** 新しい施設を作成
- `GET /api/facilities/{id}/`
  - **説明:** 特定の施設の詳細を取得
- `PUT /api/facilities/{id}/`
  - **説明:** 特定の施設情報を更新
- `DELETE /api/facilities/{id}/`
  - **説明:** 特定の施設を削除

### 予約 (`/api/reservations/`)
- `GET /api/reservations/`
  - **説明:** 予約リストを取得 (日付、施設などでフィルタ可能)
  - **クエリパラメータ例:** `?facility_id=1&start_date=2026-04-01&end_date=2026-04-30`
- `POST /api/reservations/`
  - **説明:** 新しい予約を作成
- `GET /api/reservations/{id}/`
  - **説明:** 特定の予約の詳細を取得
- `PATCH /api/reservations/{id}/`
  - **説明:** 特定の予約情報を部分的に更新 (例: 支払い状況の変更)
  - **リクエストボディ例:** `{ "payment_status": "paid" }`

### ダッシュボード (`/api/dashboard/`)
- `GET /api/dashboard/sales/`
  - **説明:** 売上データを取得
  - **クエリパラメータ例:** `?year=2026` または `?year=2025&month=4`

### 空室在庫 (`/api/availability/`)
- `GET /api/availability/`
  - **説明:** 指定した期間と施設の空室状況を取得
  - **クエリパラメータ例:** `?facility_id=1&start_date=2026-05-01&end_date=2026-05-31`
- `POST /api/availability/block/`
  - **説明:** 特定の日付範囲の予約をブロックする
  - **リクエストボディ:** `{ "facility_id": 1, "start_date": "2026-06-10", "end_date": "2026-06-12", "reason": "Maintenance" }`
- `DELETE /api/availability/block/{block_id}/`
  - **説明:** 設定した予約ブロックを解除


## セットアップ手順

### フロントエンド (React)

1.  **Node.jsのバージョン設定**
    `frontend`ディレクトリに移動し、Node Version Manager (`nvm`) を使って、プロジェクトで指定されたNode.jsのバージョンに切り替えます。
    ```bash
    cd frontend
    nvm use
    ```
    `.nvmrc`ファイルが使われるべきバージョンを自動的に読み込みます。もし該当バージョンがインストールされていない場合、`nvm install`を実行するよう`nvm`が指示してくれます。

2.  **依存関係のインストール**
    `npm`を使って必要なパッケージをインストールします。
    ```bash
    npm install
    ```

3.  **開発サーバーの起動**
    ```bash
    npm run dev
    ```
    サーバーが起動したら、コンソールに表示される `http://localhost:xxxx` のアドレスにブラウザでアクセスしてください。

---

### バックエンド (Django)

macOSでの環境構築手順です。

1.  **Pythonのバージョン管理 (`pyenv`)**
    `pyenv`がインストールされていない場合は、Homebrewでインストールすることを推奨します。
    ```bash
    brew install pyenv
    ```
    シェルの設定ファイル（`.zshrc`など）に初期化スクリプトを追加してください。
    ```bash
    echo 'eval "$(pyenv init -)"' >> ~/.zshrc
    ```

2.  **Pythonのインストール**
    プロジェクトのルートディレクトリに移動し、`.python-version`ファイルに記載されたPythonをインストールします。
    ```bash
    # (プロジェクトのルートディレクトリで実行)
    pyenv install
    ```

3.  **仮想環境の作成と有効化**
    `backend`ディレクトリに移動し、`venv`という名前の仮想環境を作成して有効化（アクティベート）します。
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    ```
    これ以降のコマンドは、仮想環境が有効化された状態（プロンプトの先頭に`(venv)`と表示された状態）で実行してください。

4.  **依存関係のインストール**
    `pip`を使ってDjangoをインストールします。
    ```bash
    pip install django
    ```

5.  **データベースの初期化**
    以下のコマンドでデータベースを作成します。（初回のみ）
    ```bash
    python manage.py migrate
    ```

6.  **開発サーバーの起動**
    以下のコマンドで開発サーバーを起動します。
    ```bash
    python manage.py runserver
    ```
    起動後、ブラウザで `http://localhost:8000` にアクセスすると、Djangoのデフォルトページが表示されます。 


