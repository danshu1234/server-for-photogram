import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';

const getEmailFromToken = async (token: string, JwtService: JwtService) => {
    try {
        const payload = await JwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        return payload.email
    } catch (e) {
      console.error('JWT verification error:', e.message);
      throw new UnauthorizedException('Invalid token');
    }
}

export default getEmailFromToken