import { Resolver, Query, Args, Context, ResolveField, Parent } from '@nestjs/graphql'
import { TestingUsersService } from './testing-users.service'
import { ExperimUser } from './../ExperimUserSchema'

@Resolver(() => ExperimUser)
export class UsersResolver {
    constructor(private TestringUsersService: TestingUsersService) {}

    @Query(() => [ExperimUser], { name: 'users' })
    async findAll(): Promise<ExperimUser[]> {
        return this.TestringUsersService.findAll()
    }

    @Query(() => ExperimUser, { name: 'user', nullable: true }) 
    async findOne(
        @Args('email') email: string  
    ): Promise<ExperimUser | null> {
        const resultUser = await this.TestringUsersService.getUser(email)
        console.log('fiejfijei')
        console.log(resultUser)
        return resultUser
    }

    @Query(() => String, { name: 'test', nullable: true }) 
    async getToken(@Context() context: any): Promise<string | null> {
        const token = context.req.cookies['next-auth.session-token']
        return token
    }

    @ResolveField(() => [ExperimUser])
    async friendsUser(@Parent() user: ExperimUser): Promise<ExperimUser[]> {
        return this.TestringUsersService.getUserFriends(user.friends)
    }

    @Query(() => String, { name: 'email', nullable: true }) 
    async getUserEmail(@Context() context: any): Promise<string | null> {
        return this.TestringUsersService.getUserEmail()
    }
}