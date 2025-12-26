import axios from "axios";

export const apiClient = axios.create({
    //baseURL: "https://api.orderlystores.com/api",
    baseURL: "http://10.211.55.4/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});