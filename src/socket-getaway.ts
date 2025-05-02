import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { MessageClass } from './messageClass';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', 
    credentials: false
  },
  transports: ['websocket', 'polling'] 
})
export class SocketGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('newMessage')
  handleNewMessage(@MessageBody() message: MessageClass) {
    this.server.to(message.targetSocket).emit('replyMessage', message.message)
  }

}