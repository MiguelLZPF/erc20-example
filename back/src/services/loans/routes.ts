import {Constants} from '../../utils/config';
import { auth } from '../../middleware/auth';
import { createLoan, acceptLoan, cancelLoan, getLoan, getLoans, makeInvest, getPayPlan, publishLoan } from './controller';
import { check_getLoan, check_getLoans, check_createLoan, check_publishLoan, check_makeInvestment, check_getPayPlan, check_acceptLoan,check_cancelLoan } from "./checks";

const ROOT = `${Constants.ROOT}/loans`;

export default [
    {
      path: `${ROOT}`,
      method: "get",
      handler: [
        auth,
        check_getLoans,
        getLoans
      ]
    },
    {
      path: `${ROOT}/:param`,
      method: "get",
      handler: [
        auth,
        check_getLoan,
        getLoan
      ]
    },
    {
      path: `${ROOT}`,
      method: "post",
      handler: [
        auth,
        check_createLoan,
        createLoan
      ]
    },
    {
      path: `${ROOT}/:address/invest`,
      method: "post",
      handler: [
        auth,
        check_makeInvestment,
        makeInvest
      ]
    },
    {
      path: `${ROOT}/:address/payplan`,
      method: "get",
      handler: [
        auth,
        check_getPayPlan,
        getPayPlan
      ]
    },
    {
      path: `${ROOT}/:address/publish`,
      method: "put",
      handler: [
        auth,
        check_publishLoan,
        publishLoan
      ]

    },
    {
      path: `${ROOT}/:address/accept`,
      method: "put",
      handler: [
        auth,
        check_acceptLoan,
        acceptLoan
      ]
    },
    {
      path: `${ROOT}/:address/cancel`,
      method: "put",
      handler: [
        auth,
        check_cancelLoan,
        cancelLoan
      ]
    }
  ]