import apiClient from './client';
import { InstrumentResponse } from '../../types';

export const instrumentsApi = {
  /**
   * 악기 목록 조회
   */
  getInstruments: async (): Promise<InstrumentResponse[]> => {
    const response = await apiClient.get<InstrumentResponse[]>('/instruments');
    return response.data;
  },
};

