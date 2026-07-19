import { Module } from '@nestjs/common';
import { LoanRegistrationService } from './loan-registration.service';
import { LoanRegistrationController } from './loan-registration.controller';

@Module({
  controllers: [LoanRegistrationController],
  providers: [LoanRegistrationService],
  exports: [LoanRegistrationService],
})
export class LoanRegistrationModule {}
