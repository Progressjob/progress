import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { LocationDto, TaxonomyNameDto } from './taxonomy.dto';
import { TaxonomyService } from './taxonomy.service';

@ApiTags('taxonomy')
@Controller()
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get('categories')
  categories() {
    return this.taxonomy.listCategories();
  }

  @Get('industries')
  industries() {
    return this.taxonomy.listIndustries();
  }

  @Get('locations')
  locations() {
    return this.taxonomy.listLocations();
  }

  @Get('skills')
  skills(@Query('q') query?: string) {
    return this.taxonomy.listSkills(query);
  }
}

@ApiTags('admin taxonomy')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminTaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Post('categories')
  createCategory(@Body() dto: TaxonomyNameDto) {
    return this.taxonomy.createCategory(dto);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: TaxonomyNameDto) {
    return this.taxonomy.updateCategory(id, dto);
  }

  @Post('industries')
  createIndustry(@Body() dto: TaxonomyNameDto) {
    return this.taxonomy.createIndustry(dto);
  }

  @Post('locations')
  createLocation(@Body() dto: LocationDto) {
    return this.taxonomy.createLocation(dto);
  }

  @Post('skills')
  createSkill(@Body() dto: TaxonomyNameDto) {
    return this.taxonomy.createSkill(dto);
  }

  @Delete(':kind/:id')
  remove(
    @Param('kind') kind: 'categories' | 'industries' | 'locations' | 'skills',
    @Param('id') id: string,
  ) {
    return this.taxonomy.remove(kind, id);
  }
}
