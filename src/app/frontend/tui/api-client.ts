import axios from 'axios';

import { getConfig } from '../../../shared/config';

export const apiBaseUrl = `http://127.0.0.1:${getConfig().API_PORT}`;

export const apiClient = axios.create({ baseURL: apiBaseUrl });
