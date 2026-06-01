import { ApiProperty } from '@nestjs/swagger';

export class CursorPageDto<T> {
  @ApiProperty({ isArray: true })
  items!: T[];

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;

  constructor(items: T[], nextCursor: string | null, hasMore: boolean) {
    this.items = items;
    this.nextCursor = nextCursor;
    this.hasMore = hasMore;
  }
}
