import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isDecimal(value: object): value is { toNumber: () => number; toString: () => string } {
  const toNumber = (value as { toNumber?: unknown }).toNumber;
  if (typeof toNumber !== 'function') return false;
  // Prisma ships a minified Decimal class (constructor name "i"); the public tag is still Decimal.
  const tag = Object.prototype.toString.call(value);
  return tag === '[object Decimal]' || value.constructor?.name === 'Decimal';
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (value && typeof value === 'object') {
    if (isDecimal(value)) {
      const asNumber = value.toNumber();
      return Number.isFinite(asNumber) ? asNumber : value.toString();
    }
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
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
