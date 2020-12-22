import { Request, Response, NextFunction } from "express";
import { HTTP400Error } from "../utils/httpErrors";

/**
 * OLD stuff. Leaved as an example of how to check parameters
 * before go to functionality itself (controllers)
 */

export const checkContractParams = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body.adminAddress === undefined) {
    throw new HTTP400Error(
      "Need an address to deploy a Contract. Missing 'adminAddress'"
    );
  } else {
    next();
  }
}

/** OLD **/
export const checkIdParams = (
  { params }: Request,
  res: Response,
  next: NextFunction
) => {
  if (!params.id) {
    throw new HTTP400Error("Missing ID in Request");
  } else {
    next();
  }
};

export const checkGroupParams = (
  { params }: Request,
  res: Response,
  next: NextFunction
) => {
  if (!params.group) {
    throw new HTTP400Error("Missing Group in Request");
  } else {
    next();
  }
};

/* Search example */
export const checkSearchParams = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.query.q) {
    throw new HTTP400Error("Missing q parameter");
  } else {
    next();
  }
};