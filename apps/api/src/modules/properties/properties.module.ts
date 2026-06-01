import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../storage/storage.module';
import { Building } from './entities/building.entity';
import { Property } from './entities/property.entity';
import { Unit } from './entities/unit.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyRepository } from './repositories/property.repository';
import { UnitRepository } from './repositories/unit.repository';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, Building, Unit]),
    StorageModule,
    AuditLogsModule,
  ],
  controllers: [PropertiesController, UnitsController],
  providers: [
    PropertiesService,
    UnitsService,
    PropertyRepository,
    UnitRepository,
  ],
  exports: [PropertiesService, UnitsService, PropertyRepository],
})
export class PropertiesModule {}
