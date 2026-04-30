import axios from "axios";
import axiosRetry from "axios-retry";

export const apiClient = axios.create({
    //baseURL: "https://api.orderlystores.com/api",
    baseURL: "http://10.211.55.4/api",
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