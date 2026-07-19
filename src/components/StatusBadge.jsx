import './StatusBadge.css'

const STATUS_LABELS = {
  beklemede: 'BEKLEMEDE',
  uretimde: 'ÜRETİMDE',
  durdu: 'DURDU',
}

function StatusBadge({ status, size = 'md' }) {
  return (
    <span className={`status-badge status-badge--${status} status-badge--${size}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default StatusBadge
