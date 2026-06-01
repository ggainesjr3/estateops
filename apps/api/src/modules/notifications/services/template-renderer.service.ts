import { Injectable, BadRequestException } from '@nestjs/common';
import Handlebars from 'handlebars';

@Injectable()
export class TemplateRendererService {
  render(template: string, variables: Record<string, unknown>): string {
    try {
      const compiled = Handlebars.compile(template, { strict: false, noEscape: false });
      return compiled(variables);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Template render failed';
      throw new BadRequestException(`Invalid template: ${message}`);
    }
  }
}
