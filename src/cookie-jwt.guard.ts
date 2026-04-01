import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './UserSchema';
import { Model } from 'mongoose';

@Injectable()
export class CookieJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService, @InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookie(request);
    
    if (!token) {
      throw new UnauthorizedException('Token not found in cookies');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const findUser = await this.userModel.findOne({email: payload.email})
      if (payload.version !== findUser?.versionToken) {
        throw new UnauthorizedException('Token version invalid. Please login again');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromCookie(request: any): string | null {
    return request.cookies?.accessToken|| null;
  }
}