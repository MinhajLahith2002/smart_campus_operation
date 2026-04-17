import React from 'react';
import { Badge } from '../ui/Primitives';
import { formatResourceStatus } from '../../lib/moduleAApi';

export const ResourceStatusBadge = ({ status }) => (
  <Badge variant={status === 'ACTIVE' ? 'success' : 'danger'}>
    {formatResourceStatus(status)}
  </Badge>
);
