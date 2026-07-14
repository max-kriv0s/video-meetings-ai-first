export class GetMeetingByIdQuery {
  constructor(
    public readonly ownerId: string,
    public readonly meetingId: string,
  ) {}
}
