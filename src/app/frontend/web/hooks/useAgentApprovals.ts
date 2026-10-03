import axios from 'axios';

import { useAgentApprovals as useCoreAgentApprovals } from '../../core/hooks/useAgentApprovals';

export type { PendingApproval } from '../../core/hooks/useAgentApprovals';

export function useAgentApprovals(refreshKey: unknown) {
  return useCoreAgentApprovals({ apiClient: axios, refreshKey });
}
