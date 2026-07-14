import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult, toMeetingResult } from '../../meeting.types';
import { GetMeetingsQuery } from '../impl/get-meetings.query';

@QueryHandler(GetMeetingsQuery)
export class GetMeetingsHandler implements IQueryHandler<
  GetMeetingsQuery,
  MeetingResult[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ ownerId }: GetMeetingsQuery): Promise<MeetingResult[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: { ownerId },
    });
    return meetings.map(toMeetingResult);
  }
}
