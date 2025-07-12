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
    console.log(message)
    this.server.to(message.targetSocket).emit('replyMessage', message.message)
  }

  @SubscribeMessage('getAllSockets')
  getAllSockets(@MessageBody() message: {targetSocket: string}) {
    const allSockets = Array.from(this.server.sockets.sockets.values());
    const resultSocketsId = allSockets.map(el => el.id)
    this.server.to(message.targetSocket).emit('resultSockets', resultSocketsId)
  }

}