import './SeatGrid.css';

/**
 * Groups flat seat list into rows by the leading letter of seatNumber (A1, A2... B1, B2...).
 * Falls back to a single row if seat numbers don't follow that pattern.
 */
function groupByRow(seats) {
  const rows = new Map();
  for (const seat of seats) {
    const match = seat.seatNumber.match(/^([A-Za-z]+)/);
    const rowKey = match ? match[1] : 'Seats';
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push(seat);
  }
  return Array.from(rows.entries());
}

export default function SeatGrid({ seats, selectedSeats, onToggleSeat, disabled }) {
  const rows = groupByRow(seats);

  const getSeatClass = (seat) => {
    if (selectedSeats.includes(seat.seatNumber)) return 'seat seat-selected';
    if (seat.status === 'booked') return 'seat seat-booked';
    if (seat.status === 'reserved') return 'seat seat-reserved';
    return 'seat seat-available';
  };

  const isClickable = (seat) => seat.status === 'available' && !disabled;

  return (
    <div className="seat-grid-wrap">
      <div className="screen-indicator">Stage / Screen</div>

      <div className="seat-grid">
        {rows.map(([rowLabel, rowSeats]) => (
          <div className="seat-row" key={rowLabel}>
            <span className="row-label">{rowLabel}</span>
            <div className="seat-row-seats">
              {rowSeats.map((seat) => (
                <button
                  key={seat.seatNumber}
                  type="button"
                  className={getSeatClass(seat)}
                  disabled={!isClickable(seat) && !selectedSeats.includes(seat.seatNumber)}
                  onClick={() => onToggleSeat(seat.seatNumber)}
                  title={`${seat.seatNumber} — ${seat.status}`}
                  aria-pressed={selectedSeats.includes(seat.seatNumber)}
                >
                  {seat.seatNumber.replace(/^[A-Za-z]+/, '')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="seat-legend">
        <span className="legend-item">
          <span className="legend-swatch seat-available" /> Available
        </span>
        <span className="legend-item">
          <span className="legend-swatch seat-selected" /> Selected
        </span>
        <span className="legend-item">
          <span className="legend-swatch seat-reserved" /> Reserved
        </span>
        <span className="legend-item">
          <span className="legend-swatch seat-booked" /> Booked
        </span>
      </div>
    </div>
  );
}
