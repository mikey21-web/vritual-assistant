import { IsString, IsDateString, IsOptional, IsIn } from 'class-validator';

export class UpdateTaskDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsIn(['pending', 'in_progress', 'done', 'cancelled']) @IsOptional() status?: string;
  @IsIn(['low', 'medium', 'high', 'urgent']) @IsOptional() priority?: string;
  @IsDateString() @IsOptional() dueAt?: string;
  @IsString() @IsOptional() assigneeId?: string;
}
