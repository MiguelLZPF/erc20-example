import { Request, Response, NextFunction, Router } from "express";
import * as ErrorHandler from "../utils/errorHandler";

// if nothign else was found // We don’t handle 404 error in its middleware
const handle404Error = (router: Router) => {
  router.use((req: Request, res: Response) => {
    ErrorHandler.notFoundError();
  });
};

// API errors like bad request or Unauthorized
const handleClientError = (router: Router) => {
  router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    ErrorHandler.clientError(err, res, next);
  });
};

// Internal Server Errors
const handleServerError = (router: Router) => {
  router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    ErrorHandler.serverError(err, res, next);
  });
};

export default [handle404Error, handleClientError, handleServerError];