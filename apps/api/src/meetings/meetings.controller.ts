import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../jwt/current-user.decorator';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import type { AuthenticatedUser } from '../jwt/jwt.types';
import { CreateMeetingCommand } from './commands/impl/create-meeting.command';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResult } from './meeting.types';
import { GetMeetingByIdQuery } from './queries/impl/get-meeting-by-id.query';
import { GetMeetingsQuery } from './queries/impl/get-meetings.query';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMeetingDto,
  ): Promise<MeetingResult> {
    return this.commandBus.execute(
      new CreateMeetingCommand(
        user.userId,
        dto.title,
        dto.date,
        dto.participants,
      ),
    );
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<MeetingResult[]> {
    return this.queryBus.execute(new GetMeetingsQuery(user.userId));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MeetingResult> {
    return this.queryBus.execute(new GetMeetingByIdQuery(user.userId, id));
  }
}
