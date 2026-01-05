import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssociateUserGroupDto {
  @ApiProperty({ example: 'uuid-of-group' })
  @IsUUID()
  @IsNotEmpty()
  groupId: string;
}
