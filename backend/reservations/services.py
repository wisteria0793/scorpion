import csv
import html
import io
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Set

import requests
from django.conf import settings


class Beds24SyncError(Exception):
    """Raised when Beds24 data cannot be fetched or parsed."""


# Normalize common Beds24 CSV headers to internal field names
_COLUMN_ALIASES: Dict[str, List[str]] = {
    'beds24_book_id': ['masterid', 'bookid', 'bookingid'],
    'room_id': ['roomid', 'room'],
    'property_key': ['propertykey', 'propertyid', 'property'],
    'status': ['status'],
    'total_price': ['price', 'totalprice', 'bookingprice'],
    'check_in_date': ['firstnight', 'arrival'],
    'check_out_date': ['lastnight', 'departure'],
    'adult_guests': ['adult', 'adults'],
    'child_guests': ['child', 'children'],
    'guest_name': ['name', 'guestname'],
    'guest_email': ['email', 'guestemail'],
}

_REQUIRED_FIELDS = {'beds24_book_id', 'status', 'check_in_date', 'check_out_date', 'total_price'}


def fetch_beds24_bookings(
    start: date,
    end: date,
    include_cancelled: bool = False,
    allowed_statuses: Optional[Set[str]] = None,
    excluded_statuses: Optional[Set[str]] = None,
) -> List[Dict]:
    """Fetch bookings from Beds24 for the given date range and return normalized rows."""
    url = "https://www.beds24.com/api/csv/getbookingscsv"
    params = {
        'username': settings.BEDS24_USERNAME,
        'password': settings.BEDS24_PASSWORD,
        'datefrom': start.strftime("%Y-%m-%d"),
        'dateto': end.strftime("%Y-%m-%d"),
        'includeInvoiceItems': 'true',
    }

    try:
        response = requests.post(url, data=params, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:  # pragma: no cover - network guarded
        raise Beds24SyncError(f"Failed to fetch Beds24 data: {exc}") from exc

    return parse_beds24_csv(
        response.text,
        include_cancelled=include_cancelled,
        allowed_statuses=allowed_statuses,
        excluded_statuses=excluded_statuses,
    )


def parse_beds24_csv(
    csv_text: str,
    include_cancelled: bool = False,
    allowed_statuses: Optional[Set[str]] = None,
    excluded_statuses: Optional[Set[str]] = None,
) -> List[Dict]:
    """Parse Beds24 CSV payload into normalized booking dictionaries."""
    reader = csv.reader(io.StringIO(csv_text))
    try:
        raw_header = next(reader)
    except StopIteration:
        return []

    normalized_header = [_normalize(col) for col in raw_header]
    indices = _build_column_index(normalized_header)

    bookings: List[Dict] = []
    for row in reader:
        try:
            status_val = row[indices['status']].strip()
        except (IndexError, KeyError):
            status_val = ''

        if excluded_statuses and status_val in excluded_statuses:
            continue
        if allowed_statuses is not None:
            if status_val not in allowed_statuses:
                continue
        elif not include_cancelled and status_val not in ("Confirmed", "New"):
            continue

        book_id = _safe_int(row, indices.get('beds24_book_id'))
        if book_id is None:
            continue

        try:
            check_in = _parse_date(row, indices.get('check_in_date'))
            check_out = _parse_date(row, indices.get('check_out_date'))
        except ValueError:
            continue

        bookings.append({
            'beds24_book_id': book_id,
            'room_id': _safe_str(row, indices.get('room_id')),
            'property_key': _safe_str(row, indices.get('property_key')),
            'status': status_val or 'Unknown',
            'total_price': _safe_decimal(row, indices.get('total_price')),
            'check_in_date': check_in,
            'check_out_date': check_out,
            'adult_guests': _safe_int(row, indices.get('adult_guests')) or 0,
            'child_guests': _safe_int(row, indices.get('child_guests')) or 0,
            'guest_name': html.unescape(_safe_str(row, indices.get('guest_name')) or ''),
            'guest_email': _safe_str(row, indices.get('guest_email')) or '',
        })

    return bookings


def _normalize(value: str) -> str:
    return value.strip().strip('"').lower().replace(' ', '').replace('_', '')


def _build_column_index(normalized_header: List[str]) -> Dict[str, int]:
    indices: Dict[str, int] = {}
    for field, aliases in _COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized_header:
                indices[field] = normalized_header.index(alias)
                break

    missing = _REQUIRED_FIELDS - set(indices.keys())
    if missing:
        raise Beds24SyncError(f"Missing required columns in Beds24 CSV: {', '.join(sorted(missing))}")

    return indices


def _safe_int(row: List[str], index: Optional[int]) -> Optional[int]:
    if index is None:
        return None
    try:
        raw = row[index].strip()
        return int(raw) if raw else None
    except (ValueError, IndexError):
        return None


def _safe_str(row: List[str], index: Optional[int]) -> Optional[str]:
    if index is None:
        return None
    try:
        return row[index].strip()
    except IndexError:
        return None


def _safe_decimal(row: List[str], index: Optional[int]) -> Decimal:
    if index is None:
        return Decimal('0.00')
    try:
        raw = row[index].strip()
        return Decimal(raw) if raw else Decimal('0.00')
    except (IndexError, ValueError, ArithmeticError):
        return Decimal('0.00')


def _parse_date(row: List[str], index: Optional[int]):
    if index is None:
        raise ValueError("Missing date column")
    raw = row[index].strip()
    return datetime.strptime(raw, "%d %b %Y").date()
