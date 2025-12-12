import csv
import html
import io
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Set

import requests
from django.conf import settings
from django.utils import timezone

from guest_forms.models import Property
from .models import Reservation, SyncStatus


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


def sync_bookings_to_db(
    bookings: List[Dict],
    start_date: date,
    end_date: date,
    property_filter_id: Optional[int] = None,
) -> Dict[str, int]:
    """Persist Beds24 bookings into the local DB and mark cancellations.

    Args:
        bookings: normalized booking dicts from Beds24.
        start_date: date range start (used for cancellation detection).
        end_date: date range end (used for cancellation detection).
        property_filter_id: if provided, only sync bookings mapped to this property.

    Returns:
        dict with counters: created, updated, cancelled, missing_property.
    """

    room_map: Dict[str, Property] = {}
    property_key_map: Dict[str, Property] = {}

    prop_qs = Property.objects.all()
    if property_filter_id is not None:
        prop_qs = prop_qs.filter(id=property_filter_id)

    for prop in prop_qs:
        if prop.room_id is not None:
            room_map[str(prop.room_id)] = prop
        if prop.beds24_property_key:
            property_key_map[str(prop.beds24_property_key)] = prop

    if not room_map and not property_key_map:
        raise Beds24SyncError("No properties with room_id or beds24_property_key found. Cannot map bookings.")

    created_count = 0
    updated_count = 0
    missing_property_count = 0
    api_booking_ids = set()

    for booking in bookings:
        api_booking_ids.add(booking['beds24_book_id'])

        property_obj = room_map.get(booking.get('room_id')) or property_key_map.get(booking.get('property_key'))
        if property_filter_id is not None and property_obj and property_obj.id != property_filter_id:
            # Skip bookings not belonging to the requested property
            continue

        if not property_obj:
            missing_property_count += 1
            continue

        num_guests = (booking.get('adult_guests') or 0) + (booking.get('child_guests') or 0)
        defaults = {
            'property': property_obj,
            'status': booking['status'],
            'total_price': booking['total_price'],
            'check_in_date': booking['check_in_date'],
            'check_out_date': booking['check_out_date'],
            'num_guests': num_guests,
            'guest_name': booking.get('guest_name', ''),
            'guest_email': booking.get('guest_email', ''),
        }

        obj, created = Reservation.objects.update_or_create(
            beds24_book_id=booking['beds24_book_id'],
            defaults=defaults,
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    # Detect cancellations within the date window
    cancelled_count = 0
    db_reservations = Reservation.objects.filter(
        check_in_date__range=(start_date, end_date),
        status__in=["Confirmed", "New", "Unknown"],
    )
    if property_filter_id is not None:
        db_reservations = db_reservations.filter(property_id=property_filter_id)

    db_booking_ids = set(db_reservations.values_list('beds24_book_id', flat=True))
    cancelled_ids = db_booking_ids - api_booking_ids

    if cancelled_ids:
        cancelled_count = db_reservations.filter(beds24_book_id__in=cancelled_ids).update(status='Cancelled')

    # Update last sync time
    sync_time = timezone.now()
    SyncStatus.objects.update_or_create(
        pk=1,
        defaults={'last_sync_time': sync_time},
    )

    return {
        'created': created_count,
        'updated': updated_count,
        'cancelled': cancelled_count,
        'missing_property': missing_property_count,
    }


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
