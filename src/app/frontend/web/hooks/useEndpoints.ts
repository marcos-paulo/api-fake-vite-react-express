import axios from 'axios';

import { useEndpoints as useCoreEndpoints } from '../../core/hooks/useEndpoints';
import { useReloadSubscription } from './useReloadSubscription';

export type { FeedbackMessage, LoadingState } from '../../core/hooks/useEndpoints';

export function useEndpoints() {
  return useCoreEndpoints({ apiClient: axios, useReloadSubscription });
}
