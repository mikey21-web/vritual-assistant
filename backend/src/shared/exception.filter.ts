import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const isProduction = process.env.NODE_ENV === 'production';

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const exResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let clientMessage: string;
    let logDetail: string;

    if (exception instanceof HttpException) {
      if (typeof exResponse === 'string') {
        clientMessage = exResponse;
        logDetail = exResponse;
      } else if (exResponse && typeof exResponse === 'object') {
        const validationErrors = (exResponse as any).message;
        logDetail = JSON.stringify(exResponse);
        if (status === 400 && Array.isArray(validationErrors)) {
          clientMessage = isProduction ? 'Validation failed' : validationErrors.join('; ');
        } else {
          clientMessage = (exResponse as any).message || (exResponse as any).error || 'Request failed';
        }
      } else {
        clientMessage = 'Request failed';
        logDetail = 'Unknown HttpException response';
      }
    } else if (exception?.constructor?.name === 'PrismaClientKnownRequestError') {
      const code = (exception as any).code;
      // Map Prisma error codes to proper HTTP statuses
      const prismaMap: Record<string, { status: number; message: string }> = {
        P2002: { status: 409, message: 'A record with this value already exists' },
        P2003: { status: 400, message: 'Referenced record not found' },
        P2025: { status: 404, message: 'Record not found' },
      };
      const mapped = prismaMap[code] || { status: 400, message: 'Database constraint error' };
      logDetail = (exception as any).message;
      this.logger.warn(`Prisma error ${code}: ${logDetail}`);
      return response.status(mapped.status).json({
        statusCode: mapped.status,
        message: isProduction ? mapped.message : `${mapped.message} (${code})`,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else if (exception?.constructor?.name === 'PrismaClientValidationError') {
      const msg = exception instanceof Error ? exception.message : 'Prisma validation error';
      this.logger.warn(`Prisma validation: ${msg}`);
      return response.status(400).json({
        statusCode: 400,
        message: isProduction ? 'Validation failed' : msg,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      const errorMsg = exception instanceof Error ? exception.message : String(exception);
      logDetail = errorMsg;
      if (exception instanceof Error && exception.stack) {
        logDetail += '\n' + exception.stack;
      }
      clientMessage = isProduction ? 'Internal server error' : errorMsg;
    }

    this.logger.error(`${request.method} ${request.url} → ${status}: ${logDetail}`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: clientMessage,
    });
  }
}
