import { Module } from '@nestjs/common';
import { CareersRepository } from './careers.repository.js';

@Module({
  providers: [CareersRepository],
  exports: [CareersRepository],
})
export class CareersModule {}
