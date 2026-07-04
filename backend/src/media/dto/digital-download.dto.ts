import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDownloadDto {
  @ApiProperty({ description: 'Media file ID to create download link for' })
  @IsString()
  mediaId: string;

  @ApiProperty({ description: 'Lead ID to associate with this download' })
  @IsString()
  leadId: string;
}
