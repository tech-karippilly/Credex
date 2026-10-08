import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (this.isFormattedResponse(data)) {
          return data as ApiSuccessResponse<T>;
        }

        return {
          success: true,
          message: 'Request successful',
          data,
        };
      }),
    );
  }

  private isFormattedResponse(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      typeof record.success === 'boolean' && typeof record.message === 'string'
    );
  }
}
