# 料金カレンダー 使い方ガイド

## アクセス方法

### 1. サーバーを起動

**バックエンド（Django）**
```bash
cd /workspaces/scorpion/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**フロントエンド（React）**
```bash
cd /workspaces/scorpion/frontend
npm install  # 初回のみ
npm run dev
```

### 2. ブラウザでアクセス

1. ブラウザで http://localhost:5173/ を開く
2. ログイン画面が表示されます
3. ログインまたは新規登録
4. 左サイドメニューから **「料金カレンダー」** をクリック

## 画面の使い方

### カレンダー表示

![料金カレンダー画面]

#### 施設選択
- 画面上部のドロップダウンで施設を選択
- 選択した施設の料金が表示されます

#### 月の切り替え
- **< ボタン**: 前月へ
- **> ボタン**: 次月へ

#### カレンダーの見方
各日付には以下の情報が表示されます：
- **日付**: 月の日
- **料金**: ¥8,000 のように表示
- **最小宿泊数**: 「最小2泊」のように表示
- **予約可否**: 
  - 白背景 = 予約可能
  - グレー背景 = 予約不可

### 料金の編集

1. **日付をクリック**: 編集したい日付のセルをクリック
2. **編集ダイアログが開きます**:
   - **基本料金**: 1泊あたりの料金（例: 8000）
   - **最小宿泊数**: この日からの最小宿泊数（例: 2）
   - **予約可否**: 予約可能/予約不可を選択
3. **保存ボタン**: 変更を保存
4. **キャンセルボタン**: 変更を破棄

## サンプルデータについて

現在、以下の施設に90日分のサンプル料金が設定されています：

### 料金パターン
- **平日（月〜木）**: ¥8,000 / 泊、最小1泊
- **金・土**: ¥15,000 / 泊、最小2泊  
- **日曜**: ¥12,000 / 泊、最小1泊
- **年末年始（12/28〜1/3）**: ¥25,000 / 泊、最小2泊

### 登録済み施設
- Test Property
- 巴.com
- ONE PIECE HOUSE
- 巴.com プレミアムステイ
- 巴.com 5 Cafe&Stay
- 巴.com 3
- Guest house 巴.com hakodate motomachi
- mimosa

## よくある質問

### Q: 料金が表示されない
**A:** 以下を確認してください：
1. バックエンドサーバーが起動している
2. ログインしている
3. 施設が選択されている
4. サンプルデータが作成されている
   ```bash
   cd /workspaces/scorpion/backend
   source venv/bin/activate
   python manage.py create_sample_rates --days 90
   ```

### Q: 料金を変更できない
**A:** ログインしているか確認してください。未ログインでは閲覧のみ可能です。

### Q: 複数日の料金を一括設定したい
**A:** 現在は1日ずつの編集のみ対応。一括設定機能は今後実装予定です。

### Q: Beds24から自動で料金を取得したい
**A:** `sync_rates` コマンドがありますが、Beds24の正しいAPIエンドポイントを調査中です。
現在は手動編集またはサンプルデータ作成コマンドをご利用ください。

## 次のステップ

- [ ] Beds24 APIからの自動同期
- [ ] 期間一括設定機能
- [ ] 料金ルールテンプレート
- [ ] CSVインポート/エクスポート
- [ ] 予約との連携（予約作成時の料金自動計算）

## トラブルシューティング

### サーバーが起動しない
```bash
# ポートが使われている場合
lsof -i :8000  # バックエンドのポート確認
lsof -i :5173  # フロントエンドのポート確認

# 強制終了
kill -9 <PID>
```

### npm install でエラーが出る
```bash
cd /workspaces/scorpion/frontend
rm -rf node_modules package-lock.json
npm install
```

### データベースエラー
```bash
cd /workspaces/scorpion/backend
source venv/bin/activate
python manage.py migrate
```

## お問い合わせ

問題が解決しない場合は、ログを確認してください：
```bash
# バックエンドログ
tail -f /tmp/backend.log

# Django開発サーバー直接起動
cd /workspaces/scorpion/backend
source venv/bin/activate
python manage.py runserver  # ログが直接表示される
```
