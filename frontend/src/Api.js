import axios from 'axios';

const api = axios.create({
    baseURL: 'http://158.69.215.13/tgt',
});

export default api;
