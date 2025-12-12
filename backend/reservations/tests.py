from django.test import SimpleTestCase

from reservations.services import parse_beds24_csv


class Beds24ParsingTests(SimpleTestCase):
	def test_parses_confirmed_booking(self):
		csv_text = (
			"Master ID,Roomid,Status,Price,First Night,Last Night,Adult,Child,Name,Email,Property Key\n"
			"123,10,Confirmed,12000,01 Jan 2025,02 Jan 2025,2,0,Test Guest,test@example.com,999\n"
		)

		bookings = parse_beds24_csv(csv_text)

		self.assertEqual(len(bookings), 1)
		booking = bookings[0]
		self.assertEqual(booking['beds24_book_id'], 123)
		self.assertEqual(booking['room_id'], '10')
		self.assertEqual(booking['property_key'], '999')
		self.assertEqual(booking['adult_guests'], 2)
		self.assertEqual(booking['child_guests'], 0)
		self.assertEqual(str(booking['check_in_date']), '2025-01-01')
		self.assertEqual(str(booking['check_out_date']), '2025-01-02')

	def test_excluded_statuses_are_dropped(self):
		csv_text = (
			"Master ID,Roomid,Status,Price,First Night,Last Night,Adult,Child,Name,Email\n"
			"123,10,Cancelled,12000,01 Jan 2025,02 Jan 2025,2,0,Test Guest,test@example.com\n"
		)

		bookings = parse_beds24_csv(csv_text, include_cancelled=True, excluded_statuses={'Cancelled'})

		self.assertEqual(bookings, [])
