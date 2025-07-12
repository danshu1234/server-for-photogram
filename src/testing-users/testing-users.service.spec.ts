import { Test, TestingModule } from '@nestjs/testing';
import { TestingUsersService } from './testing-users.service';

describe('TestingUsersService', () => {
  let service: TestingUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestingUsersService],
    }).compile();

    service = module.get<TestingUsersService>(TestingUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
