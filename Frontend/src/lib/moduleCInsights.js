export const INCIDENT_KEYWORDS = {
  CRITICAL: ['fire', 'smoke', 'flood', 'gas leak', 'electric shock', 'sparking', 'collapse', 'unsafe', 'injury'],
  HIGH: ['network down', 'lab closed', 'water leak', 'power outage', 'security', 'camera offline', 'server down'],
  MEDIUM: ['projector', 'air conditioner', 'wifi', 'router', 'printer', 'lighting', 'door'],
};

const normalise = (value = '') => value.trim().toLowerCase();

export const parseEvidenceItems = (value = '') => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const scoreIncident = ({ title = '', description = '', operationalImpact = '', category = '', evidenceItems = [] }) => {
  const text = [title, description, operationalImpact].join(' ').toLowerCase();
  let score = 22;

  if (category === 'SAFETY') score += 28;
  if (category === 'NETWORK') score += 10;
  if (evidenceItems.length) score += Math.min(evidenceItems.length * 8, 24);
  if (description.trim().length >= 80) score += 12;
  if (operationalImpact.trim().length >= 20) score += 10;

  INCIDENT_KEYWORDS.CRITICAL.forEach((keyword) => {
    if (text.includes(keyword)) score += 18;
  });

  INCIDENT_KEYWORDS.HIGH.forEach((keyword) => {
    if (text.includes(keyword)) score += 10;
  });

  INCIDENT_KEYWORDS.MEDIUM.forEach((keyword) => {
    if (text.includes(keyword)) score += 4;
  });

  return Math.min(score, 100);
};

export const suggestedPriorityFromScore = (score) => {
  if (score >= 82) return 'CRITICAL';
  if (score >= 62) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
};

export const responseTargetFromPriority = (priority) => {
  switch (priority) {
    case 'CRITICAL':
      return 'Immediate dispatch';
    case 'HIGH':
      return 'Within 4 working hours';
    case 'MEDIUM':
      return 'Within 1 working day';
    default:
      return 'Within 2 working days';
  }
};

export const completenessScore = ({ title = '', description = '', operationalImpact = '', preferredContact = '', incidentLocation = '', evidenceItems = [] }) => {
  let score = 0;
  if (title.trim().length >= 8) score += 20;
  if (description.trim().length >= 30) score += 30;
  if (operationalImpact.trim().length >= 12) score += 20;
  if (preferredContact.trim()) score += 15;
  if (evidenceItems.length) score += 15;
  return score;
};

export const validateTicketDraft = ({ title = '', description = '', operationalImpact = '', preferredContact = '', incidentLocation = '', evidenceItems = [], priority = '', category = '' }) => {
  const errors = {};
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const trimmedImpact = operationalImpact.trim();
  const trimmedContact = preferredContact.trim();
  const trimmedIncidentLocation = incidentLocation.trim();

  if (trimmedTitle.length < 8) errors.title = 'Use a clearer title with at least 8 characters.';
  if (trimmedDescription.length < 30) errors.description = 'Describe the issue in at least 30 characters so triage can act quickly.';
  if (trimmedImpact.length < 12) errors.operationalImpact = 'Explain the operational impact in at least 12 characters.';
  if (!trimmedContact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact)) {
    errors.preferredContact = 'Enter a valid contact email.';
  }
  if (trimmedIncidentLocation.length < 6) {
    errors.incidentLocation = 'Provide a clearer exact location for the technician.';
  }
  if (evidenceItems.length > 3) errors.evidenceReference = 'Only up to 3 evidence references are allowed.';
  if (new Set(evidenceItems.map((item) => item.toLowerCase())).size !== evidenceItems.length) {
    errors.evidenceReference = 'Evidence references should be unique.';
  }
  if (evidenceItems.some((item) => item.length > 80)) {
    errors.evidenceReference = 'Keep each evidence reference under 80 characters.';
  }

  const score = scoreIncident({ title, description, operationalImpact, category, evidenceItems });
  const suggestedPriority = suggestedPriorityFromScore(score);
  const priorityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  if ((priorityRank[priority] || 0) + 1 < (priorityRank[suggestedPriority] || 0)) {
    errors.priority = `This incident reads more like ${suggestedPriority}. Raise the priority or reduce the urgency language.`;
  }

  return errors;
};

export const findSimilarTickets = ({ tickets = [], resourceName = '', category = '', title = '' }) => {
  const titleTerms = normalise(title)
    .split(/\s+/)
    .filter((term) => term.length > 3);

  return tickets.filter((ticket) => {
    if (['CLOSED', 'REJECTED'].includes(ticket.status)) return false;
    const sameResource = normalise(ticket.resourceName) === normalise(resourceName);
    const sameCategory = ticket.category === category;
    const sharedTerm = titleTerms.some((term) => normalise(ticket.title).includes(term));
    return sameResource || (sameCategory && sharedTerm);
  });
};

export const maintenanceHealth = ({ similarCount = 0, priority = 'LOW', evidenceCount = 0 }) => {
  const base = 92 - (similarCount * 9) - ({ LOW: 4, MEDIUM: 10, HIGH: 16, CRITICAL: 22 }[priority] || 0) + Math.min(evidenceCount * 2, 6);
  return Math.max(18, Math.min(98, base));
};
