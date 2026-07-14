import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult, toMeetingResult } from '../../meeting.types';
import { CreateMeetingCommand } from '../impl/create-meeting.command';

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<
  CreateMeetingCommand,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    ownerId,
    title,
    date,
    participants,
  }: CreateMeetingCommand): Promise<MeetingResult> {
    const meeting = await this.prisma.meeting.create({
      data: { ownerId, title, date: new Date(date), participants },
    });
    return toMeetingResult(meeting);
  }
}
