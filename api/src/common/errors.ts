export class RouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends RouteError {
  constructor(message = 'No autorizado') {
    super(401, message);
  }
}

export class ForbiddenError extends RouteError {
  constructor(message = 'Acceso denegado') {
    super(403, message);
  }
}

export class NotFoundError extends RouteError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message);
  }
}

export class ValidationError extends RouteError {
  constructor(message = 'Error de validación') {
    super(400, message);
  }
}

export class BusinessLogicError extends RouteError {
  code: string;
  detail?: Record<string, unknown>;

  constructor(code: string, message: string, detail?: Record<string, unknown>) {
    super(422, message);
    this.code = code;
    if (detail) this.detail = detail;
  }
}
