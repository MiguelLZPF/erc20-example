import authRoutes from "./authentication/routes";
import exchangeRoutes from "./exchange/routes";
import txProxy from "./transactions_proxy/routes";
import userRoutes from "./users/routes";


export default [
    ...authRoutes,
    ...exchangeRoutes,
    ...txProxy,
    ...userRoutes
];