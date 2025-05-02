import { Module } from "@nestjs/common";
import { SocketGateway } from "./socket-getaway";

@Module({
    providers: [SocketGateway],
    exports: [SocketGateway],
})

export class SocketModule {}