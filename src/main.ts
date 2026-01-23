import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { ExpressPeerServer } from 'peer';
import * as express from 'express';
import cookieParser = require('cookie-parser');
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  
  app.use(bodyParser.json({ limit: '10mb' }));
  
  app.enableCors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });

  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName]?.forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    });
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 NESTJS СЕРВЕР ЗАПУЩЕН');
    console.log('='.repeat(60));
    
    ips.forEach(ip => {
      console.log(`📡 Доступен по адресу: http://${ip}:${port}`);
    });
    
    console.log(`🏠 Локально:          http://localhost:${port}`);
    console.log(`🌐 Для телефона:      http://${ips[0] || 'ваш-ip'}:${port}`);
    console.log('='.repeat(60));
    
  });
  
  const peerApp = express();
  
  peerApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
  
  const peerServer = peerApp.listen(3001, '0.0.0.0', () => {
    console.log(`✅ PeerJS server: http://${ips[0] || 'ваш-ip'}:3001`);
  });

  const peerJsServer = ExpressPeerServer(peerServer, {
    path: '/',
    allow_discovery: true,
  });

  peerApp.use('/peerjs', peerJsServer);
}

bootstrap();