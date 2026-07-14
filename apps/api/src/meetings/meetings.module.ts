import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '../jwt/jwt.module';
import { CreateMeetingHandler } from './commands/handlers/create-meeting.handler';
import { MeetingsController } from './meetings.controller';
import { GetMeetingByIdHandler } from './queries/handlers/get-meeting-by-id.handler';
import { GetMeetingsHandler } from './queries/handlers/get-meetings.handler';

const CommandHandlers = [CreateMeetingHandler];
const QueryHandlers = [GetMeetingsHandler, GetMeetingByIdHandler];

@Module({
  imports: [CqrsModule, JwtModule],
  controllers: [MeetingsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingsModule {}
