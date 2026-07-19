import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StateTaxService } from './state-tax.service';

@ApiTags('State Tax')
@Controller('state-tax')
export class StateTaxController {
  constructor(private service: StateTaxService) {}

  @Get()
  getAllStates() { return this.service.getAllStates(); }

  @Get(':state')
  getRules(@Param('state') state: string) {
    const rules = this.service.getRules(state);
    if (!rules) return { state, found: false };
    return { state, found: true, ...rules };
  }
}
