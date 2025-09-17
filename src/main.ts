import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { ExpressPeerServer } from 'peer';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  
  app.use(bodyParser.json({ limit: '10mb' })); 
  app.enableCors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, 
  });

  await app.listen(process.env.PORT ?? 4000);
  
  const peerApp = express();
  const peerServer = peerApp.listen(3001, () => {
    console.log('PeerJS server running on port 3001');
  });

  const peerJsServer = ExpressPeerServer(peerServer, {
    path: '/',
    allow_discovery: true,
  });

  peerApp.use('/peerjs', peerJsServer);
  
  console.log('✅ NestJS app on port 4000');
  console.log('✅ PeerJS server on port 3001');
}

bootstrap();