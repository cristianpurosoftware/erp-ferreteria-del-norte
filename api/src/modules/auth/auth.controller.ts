import { Request, Response } from 'express';
import { successResponse } from '../../common/response';
import * as authService from './auth.service';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return successResponse(res, result);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshToken(refreshToken);
  return successResponse(res, tokens);
}
