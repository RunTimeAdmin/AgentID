import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('agentid_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      localStorage.removeItem('agentid_token');
    }
    return Promise.reject(error);
  }
);

// Agent Registry
export const getAgents = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.capability) params.append('capability', filters.capability);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await api.get(`/agents?${params.toString()}`);
  return response.data;
};

export const getAgent = async (pubkey) => {
  const response = await api.get(`/agents/${pubkey}`);
  return response.data;
};

// Trust Badge
export const getBadge = async (pubkey) => {
  const response = await api.get(`/badge/${pubkey}`);
  return response.data;
};

// Reputation
export const getReputation = async (pubkey) => {
  const response = await api.get(`/reputation/${pubkey}`);
  return response.data;
};

// Registration
export const registerAgent = async (registrationData) => {
  const response = await api.post('/register', registrationData);
  return response.data;
};

// PKI Challenge-Response
export const issueChallenge = async (pubkey) => {
  const response = await api.post('/verify/challenge', { pubkey });
  return response.data;
};

export const verifyChallenge = async (pubkey, nonce, signature) => {
  const response = await api.post('/verify/response', { 
    pubkey, 
    nonce, 
    signature 
  });
  return response.data;
};

// Attestations
export const attestAgent = async (pubkey, attestationData) => {
  const response = await api.post(`/agents/${pubkey}/attest`, attestationData);
  return response.data;
};

export const flagAgent = async (pubkey, flagData) => {
  // flagData should include: reporterPubkey, signature, timestamp, reason, evidence (optional)
  const response = await api.post(`/agents/${pubkey}/flag`, flagData);
  return response.data;
};

// Discovery
export const discoverAgents = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.capability) queryParams.append('capability', params.capability);
  if (params.minScore) queryParams.append('minScore', params.minScore);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const response = await api.get(`/discover?${queryParams.toString()}`);
  return response.data;
};

// Widget
export const getWidgetHtml = async (pubkey) => {
  const response = await api.get(`/widget/${pubkey}`);
  return response.data;
};

export const getBadgeSvg = async (pubkey) => {
  const response = await api.get(`/badge/${pubkey}/svg`);
  return response.data;
};

// Agent Updates
export const updateAgent = async (pubkey, updateData, signature, timestamp) => {
  const response = await api.put(`/agents/${pubkey}/update`, {
    ...updateData,
    signature,
    timestamp,
  });
  return response.data;
};

// Attestation and Flag History
export const getAttestations = async (pubkey) => {
  const response = await api.get(`/agents/${pubkey}/attestations`);
  return response.data;
};

export const getFlags = async (pubkey) => {
  const response = await api.get(`/agents/${pubkey}/flags`);
  return response.data;
};

export default api;
