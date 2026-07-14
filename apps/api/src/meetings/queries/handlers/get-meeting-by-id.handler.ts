import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingResult, toMeetingResult } from '../../meeting.types';
import { GetMeetingByIdQuery } from '../impl/get-meeting-by-id.query';

@QueryHandler(GetMeetingByIdQuery)
export class GetMeetingByIdHandler implements IQueryHandler<
  GetMeetingByIdQuery,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    ownerId,
    meetingId,
  }: GetMeetingByIdQuery): Promise<MeetingResult> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, ownerId },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return toMeetingResult(meeting);
  }
}
