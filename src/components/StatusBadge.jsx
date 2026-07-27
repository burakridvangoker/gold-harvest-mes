import './StatusBadge.css'

const STATUS_LABELS = {
  beklemede: 'BEKLEMEDE',
  uretimde: 'ÜRETİMDE',
  durdu: 'DURDU',
  molada: 'MOLADA',
}

function StatusBadge({ status, size = 'md' }) {
  return (
    <span className={`status-badge status-badge--${status} status-badge--${size}`}>
      <span className="status-badge-lamp" aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default StatusBadge
