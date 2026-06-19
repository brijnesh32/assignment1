import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../api/endpoints';
import './EventsPage.css';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await eventsApi.list();
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>Upcoming events</h1>
        <p className="events-subtitle">Pick an event, choose your seats, and book in minutes.</p>
      </div>

      {loading && <div className="state-msg">Loading events…</div>}
      {error && <div className="state-msg state-error">{error}</div>}

      {!loading && !error && events.length === 0 && (
        <div className="state-msg">No events available right now.</div>
      )}

      <div className="events-grid">
        {events.map((event) => (
          <Link to={`/events/${event._id}`} key={event._id} className="event-card">
            <div className="event-card-top">
              <span className="event-date">{formatDate(event.dateTime)}</span>
              <span className="event-time">{formatTime(event.dateTime)}</span>
            </div>
            <h2 className="event-name">{event.name}</h2>
            <p className="event-venue">{event.venue}</p>
            <div className="event-card-footer">
              <span
                className={
                  'availability-pill ' + (event.availableSeats === 0 ? 'pill-sold-out' : '')
                }
              >
                {event.availableSeats === 0
                  ? 'Sold out'
                  : `${event.availableSeats} of ${event.totalSeats} seats left`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
