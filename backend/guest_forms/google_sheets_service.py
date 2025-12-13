# backend/guest_forms/google_sheets_service.py

import os
import re
import logging
from typing import List, Dict, Optional, Any
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """
    Google Sheets API を利用して、予約と名簿提出の状況を管理するサービス
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, spreadsheet_id: Optional[str] = None):
        """
        Google Sheets API クライアントを初期化
        
        Args:
            spreadsheet_id: スプレッドシートID（Noneの場合は環境変数から取得）
        """
        self.spreadsheet_id = spreadsheet_id or os.getenv('GOOGLE_SHEETS_SPREADSHEET_ID')
        credentials_file = os.getenv('GOOGLE_SHEETS_CREDENTIALS_FILE')
        
        if not credentials_file:
            logger.warning("Google Sheets API credentials file path is not configured")
            self.service = None
            return
        
        try:
            # 認証情報ファイルから Credentials を作成
            credentials = Credentials.from_service_account_file(
                credentials_file,
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=credentials)
        except FileNotFoundError:
            logger.error(f"Google Sheets credentials file not found: {credentials_file}")
            self.service = None
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets API: {e}")
            self.service = None
    
    @staticmethod
    def extract_sheet_id_from_url(url: str) -> Optional[str]:
        """
        Google Sheets URL からスプレッドシートIDを抽出
        
        Args:
            url: Google Sheets URL（例：https://docs.google.com/spreadsheets/d/{ID}/edit）
        
        Returns:
            スプレッドシートID、またはNoneが URL が不正な場合
        """
        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
        if match:
            return match.group(1)
        return None
    
    def is_configured(self) -> bool:
        """Google Sheets APIが正しく設定されているかチェック"""
        return self.service is not None and self.spreadsheet_id is not None
    
    def append_reservation(self, reservation_data: Dict[str, Any]) -> bool:
        """
        新しい予約データをスプレッドシートに追加
        
        Args:
            reservation_data: 予約情報 {
                'beds24_book_id': int,
                'property_name': str,
                'guest_name': str,
                'guest_email': str,
                'check_in_date': str (YYYY-MM-DD),
                'check_out_date': str (YYYY-MM-DD),
                'num_guests': int,
                'roster_status': str ('pending', 'submitted', 'verified'),
                'total_price': float,
                'created_at': str (ISO format)
            }
        
        Returns:
            成功した場合は True、失敗した場合は False
        """
        if not self.is_configured():
            logger.warning("Google Sheets API is not configured")
            return False
        
        try:
            values = [[
                reservation_data.get('beds24_book_id', ''),
                reservation_data.get('property_name', ''),
                reservation_data.get('guest_name', ''),
                reservation_data.get('guest_email', ''),
                reservation_data.get('check_in_date', ''),
                reservation_data.get('check_out_date', ''),
                reservation_data.get('num_guests', ''),
                reservation_data.get('roster_status', 'pending'),
                reservation_data.get('total_price', ''),
                reservation_data.get('created_at', ''),
            ]]
            
            body = {
                'values': values
            }
            
            result = self.service.spreadsheets().values().append(
                spreadsheetId=self.spreadsheet_id,
                range='予約情報!A:J',  # Sheet name: '予約情報'
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            logger.info(f"Reservation appended to sheet: {reservation_data.get('beds24_book_id')}")
            return True
        
        except HttpError as error:
            logger.error(f"Google Sheets API error: {error}")
            return False
        except Exception as e:
            logger.error(f"Error appending reservation to sheet: {e}")
            return False
    
    def update_roster_status(self, beds24_book_id: int, status: str) -> bool:
        """
        既存の予約の名簿提出状況を更新
        
        Args:
            beds24_book_id: Beds24予約ID
            status: 新しいステータス ('pending', 'submitted', 'verified')
        
        Returns:
            成功した場合は True、失敗した場合は False
        """
        if not self.is_configured():
            logger.warning("Google Sheets API is not configured")
            return False
        
        try:
            # スプレッドシートから該当する行を検索
            request = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range='予約情報!A:A'
            )
            response = request.execute()
            values = response.get('values', [])
            
            # 予約IDが一致する行を探す
            row_index = None
            for idx, row in enumerate(values):
                if row and str(row[0]) == str(beds24_book_id):
                    row_index = idx + 1  # 1-indexed (headerがあるため+1)
                    break
            
            if row_index is None:
                logger.warning(f"Reservation {beds24_book_id} not found in sheet")
                return False
            
            # ステータスを更新（H列 = 8列目）
            range_name = f'予約情報!H{row_index}'
            values = [[status]]
            body = {'values': values}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            logger.info(f"Roster status updated for reservation {beds24_book_id}: {status}")
            return True
        
        except HttpError as error:
            logger.error(f"Google Sheets API error: {error}")
            return False
        except Exception as e:
            logger.error(f"Error updating roster status: {e}")
            return False
    
    def get_all_reservations(self) -> List[Dict[str, Any]]:
        """
        スプレッドシートから全ての予約情報を取得
        
        Returns:
            予約情報のリスト
        """
        if not self.is_configured():
            logger.warning("Google Sheets API is not configured")
            return []
        
        try:
            request = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range='予約情報!A:J'
            )
            response = request.execute()
            values = response.get('values', [])
            
            if not values:
                return []
            
            # ヘッダー行をスキップ
            headers = values[0]
            reservations = []
            
            for row in values[1:]:
                if len(row) >= 10:
                    reservations.append({
                        'beds24_book_id': int(row[0]) if row[0] else None,
                        'property_name': row[1],
                        'guest_name': row[2],
                        'guest_email': row[3],
                        'check_in_date': row[4],
                        'check_out_date': row[5],
                        'num_guests': int(row[6]) if row[6] else 0,
                        'roster_status': row[7],
                        'total_price': float(row[8]) if row[8] else 0.0,
                        'created_at': row[9],
                    })
            
            return reservations
        
        except HttpError as error:
            logger.error(f"Google Sheets API error: {error}")
            return []
        except Exception as e:
            logger.error(f"Error retrieving reservations: {e}")
            return []
    
    def get_pending_rosters(self) -> List[Dict[str, Any]]:
        """
        名簿がまだ提出されていない予約を取得
        
        Returns:
            提出待ちの予約情報のリスト
        """
        if not self.is_configured():
            logger.warning("Google Sheets API is not configured")
            return []
        
        try:
            request = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range='予約情報!A:J'
            )
            response = request.execute()
            values = response.get('values', [])
            
            if not values:
                return []
            
            pending_reservations = []
            for row in values[1:]:  # ヘッダー行をスキップ
                if len(row) >= 8 and row[7] == 'pending':
                    pending_reservations.append({
                        'beds24_book_id': int(row[0]) if row[0] else None,
                        'property_name': row[1],
                        'guest_name': row[2],
                        'guest_email': row[3],
                        'check_in_date': row[4],
                        'check_out_date': row[5],
                        'num_guests': int(row[6]) if row[6] else 0,
                    })
            
            return pending_reservations
        
        except Exception as e:
            logger.error(f"Error retrieving pending rosters: {e}")
            return []
    
    def create_header_row(self) -> bool:
        """
        スプレッドシートにヘッダー行を作成
        
        Returns:
            成功した場合は True、失敗した場合は False
        """
        if not self.is_configured():
            logger.warning("Google Sheets API is not configured")
            return False
        
        try:
            headers = [[
                'Beds24予約ID',
                '施設名',
                'ゲスト名',
                'メールアドレス',
                'チェックイン日',
                'チェックアウト日',
                '宿泊者数',
                '名簿提出状況',
                '合計料金',
                '作成日時'
            ]]
            
            body = {'values': headers}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range='予約情報!A1:J1',
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            logger.info("Header row created in sheet")
            return True
        
        except Exception as e:
            logger.error(f"Error creating header row: {e}")
            return False


# グローバルインスタンス
google_sheets_service = GoogleSheetsService()
