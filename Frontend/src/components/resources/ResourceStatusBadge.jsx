import React from 'react';
import { Badge } from '../ui/Primitives';
import { formatResourceStatus } from '../../lib/moduleAApi';

export const ResourceStatusBadge = ({ status }) => (
  <Badge variant={status === 'ACTIVE' ? 'success' : 'danger'} className="inline-flex items-center gap-1.5 px-3 py-1.5">
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {formatResourceStatus(status)}
  </Badge>
);
