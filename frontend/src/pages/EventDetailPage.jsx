import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi, reservationApi, bookingApi } from '../api/endpoints';
import SeatGrid from '../components/SeatGrid';
import CountdownTimer from '../components/CountdownTimer';
import './EventDetailPage.css';

// Booking flow stages:
//  'browsing'   -> picking seats, nothing reserved yet
//  'reserved'   -> seats held for this user, countdown running
//  'confirming' -> booking request in flight
//  'booked'     -> success
const STAGE = {
  BROWSING: 'browsing',
  RESERVED: 'reserved',
  CONFIRMING: 'confirming',
  BOOKED: 'booked',
};

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [stage, setStage] = useState(STAGE.BROWSING);
  const [reservation, setReservation] = useState(null); // { reservationId, expiresAt, seatNumbers }
  const [bookingResult, setBookingResult] = useState(null);

  const [actionError, setActionError] = useState(null);
  const [reserving, setReserving] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await eventsApi.get(id);
      setEvent(data);
    } catch (err) {
      setLoadError(err.response?.data?.error || 'failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const toggleSeat = (seatNumber) => {
    if (stage !== STAGE.BROWSING) return; // locked once reserved
    setActionError(null);
    setSelectedSeats((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber]
    );
  };

  const handleReserve = async () => {
    if (selectedSeats.length === 0) return;
    setReserving(true);
    setActionError(null);
    try {
      const data = await reservationApi.reserve(id, selectedSeats);
      setReservation(data);
      setStage(STAGE.RESERVED);
    } catch (err) {
      const res = err.response;
      if (res?.status === 409 && res.data?.unavailableSeats) {
        setActionError(
          `These seats were just taken by someone else: ${res.data.unavailableSeats.join(
            ', '
          )}. Please reselect.`
        );
        // Refresh seat map so the grid reflects reality, and drop the stale selections.
        await loadEvent();
        setSelectedSeats((prev) => prev.filter((s) => !res.data.unavailableSeats.includes(s)));
      } else {
        setActionError(res?.data?.error || 'failed to reserve seats, please try again');
      }
    } finally {
      setReserving(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!reservation) return;
    setStage(STAGE.CONFIRMING);
    setActionError(null);
    try {
      const data = await bookingApi.create(reservation.reservationId);
      setBookingResult(data);
      setStage(STAGE.BOOKED);
    } catch (err) {
      const res = err.response;
      setActionError(res?.data?.error || 'booking failed, please try again');
      if (res?.status === 410) {
        // Reservation expired between countdown ending and click — reset to browsing.
        resetToBrowsing();
      } else {
        setStage(STAGE.RESERVED);
      }
      await loadEvent();
    }
  };

  const resetToBrowsing = () => {
    setStage(STAGE.BROWSING);
    setReservation(null);
    setSelectedSeats([]);
  };

  const handleExpire = useCallback(() => {
    setActionError('Your reservation expired. Please select seats again.');
    resetToBrowsing();
    loadEvent();
  }, [loadEvent]);

  if (loading) return <div className="state-msg">Loading event…</div>;
  if (loadError) return <div className="state-msg state-error">{loadError}</div>;
  if (!event) return null;

  return (
    <div className="event-detail-page">
      <button className="back-link" onClick={() => navigate('/')}>
        ← All events
      </button>

      <div className="event-detail-header">
        <h1>{event.name}</h1>
        <p className="event-detail-meta">
          {new Date(event.dateTime).toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · {event.venue}
        </p>
      </div>

      {actionError && <div className="action-banner action-error">{actionError}</div>}

      {stage === STAGE.BOOKED ? (
        <div className="booking-success">
          <div className="success-icon">✓</div>
          <h2>Booking confirmed</h2>
          <p>
            Seats <strong>{bookingResult.seatNumbers.join(', ')}</strong> are booked for{' '}
            {event.name}.
          </p>
          <p className="booking-id">Booking ID: {bookingResult.bookingId}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Browse more events
          </button>
        </div>
      ) : (
        <>
          <SeatGrid
            seats={event.seats}
            selectedSeats={selectedSeats}
            onToggleSeat={toggleSeat}
            disabled={stage !== STAGE.BROWSING}
          />

          <div className="booking-bar">
            {stage === STAGE.BROWSING && (
              <>
                <div className="booking-bar-info">
                  {selectedSeats.length === 0 ? (
                    <span className="text-dim">Select one or more seats to continue</span>
                  ) : (
                    <span>
                      <strong>{selectedSeats.length}</strong> seat
                      {selectedSeats.length > 1 ? 's' : ''} selected:{' '}
                      <span className="seat-list">{selectedSeats.join(', ')}</span>
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  disabled={selectedSeats.length === 0 || reserving}
                  onClick={handleReserve}
                >
                  {reserving ? 'Reserving…' : 'Reserve seats'}
                </button>
              </>
            )}

            {(stage === STAGE.RESERVED || stage === STAGE.CONFIRMING) && reservation && (
              <>
                <div className="booking-bar-info">
                  <span>
                    Holding <strong>{reservation.seatNumbers.join(', ')}</strong> for{' '}
                    <CountdownTimer expiresAt={reservation.expiresAt} onExpire={handleExpire} />
                  </span>
                </div>
                <div className="booking-bar-actions">
                  <button className="btn btn-ghost" onClick={resetToBrowsing} disabled={stage === STAGE.CONFIRMING}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmBooking}
                    disabled={stage === STAGE.CONFIRMING}
                  >
                    {stage === STAGE.CONFIRMING ? 'Confirming…' : 'Confirm booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
