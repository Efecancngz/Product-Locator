import axios from 'axios';

// Ensure this matches your FastAPI backend URL
const API_BASE_URL = 'http://localhost:8001/api/v1';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
