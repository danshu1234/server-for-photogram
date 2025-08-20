import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AppOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const allowedOrigins = [
      'http://localhost:3000',
    ];
    
    return allowedOrigins.includes(request.headers.origin);
  }
}