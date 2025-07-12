import { Test, TestingModule } from '@nestjs/testing';
import { TestingUsersController } from './testing-users.controller';

describe('TestingUsersController', () => {
  let controller: TestingUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestingUsersController],
    }).compile();

    controller = module.get<TestingUsersController>(TestingUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
