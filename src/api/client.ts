import axios from "axios";
import axiosRetry from "axios-retry";

export const WEB_CALLBACK_URL = "https://orderlystores.com/app-callback";
// export const WEB_CALLBACK_URL = "http://localhost:3000/app-callback";
export const apiClient = axios.create({
    baseURL: "https://api.orderlystores.com/api",
    // baseURL: "http://localhost:5161/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 60000,
});

axiosRetry(apiClient, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
    },
    shouldResetTimeout: true,
});