import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('test-queue')
export class TestProcessor {
  
  @Process('long-loop')
  async handleLongLoop(job: Job) {
    for (let i=0; i<10000000000; i++) {}
    console.log('OK')

  }

}