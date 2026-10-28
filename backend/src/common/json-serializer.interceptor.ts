import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isDecimal(value: unknown): value is { toNumber: () => number; toString: () => string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.constructor?.name === 'Decimal' &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  );
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (isDecimal(value)) {
    const asNumber = value.toNumber();
    return Number.isFinite(asNumber) ? asNumber : value.toString();
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  if (value && typeof value === 'object') {
    if (seen.has(value)) return undefined;
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitize(nested, seen)]),
    );
  }
  return value;
}

@Injectable()
export class JsonSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => sanitize(data)));
  }
}
