import adminRoutes from "./admin/routes";
import authRoutes from "./authentication/routes";
import exchangeRoutes from "./exchange/routes";
import userRoutes from "./users/routes";
import loanRoutes from "./loans/routes";


export default [
    ...adminRoutes,
    ...authRoutes,
    ...exchangeRoutes,
    ...userRoutes,
    ...loanRoutes
];