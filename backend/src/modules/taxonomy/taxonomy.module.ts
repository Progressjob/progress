import { Module } from '@nestjs/common';
import { AdminTaxonomyController, TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

@Module({
  controllers: [TaxonomyController, AdminTaxonomyController],
  providers: [TaxonomyService],
})
export class TaxonomyModule {}
