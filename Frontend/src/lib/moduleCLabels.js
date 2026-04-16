export const formatTicketStatusLabel = (status = '') => {
  const map = {
    OPEN: 'Open',
    TRIAGED: 'Open',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
  };
  return map[status] || status.replace(/_/g, ' ');
};

export const statusBadgeVariant = (status = '') => {
  if (status === 'REJECTED') return 'danger';
  if (status === 'OPEN' || status === 'TRIAGED') return 'warning';
  if (status === 'ASSIGNED' || status === 'IN_PROGRESS') return 'info';
  return 'success';
};
