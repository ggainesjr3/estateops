import { TemplateRendererService } from './template-renderer.service';

describe('TemplateRendererService', () => {
  const service = new TemplateRendererService();

  it('renders handlebars variables', () => {
    const out = service.render('Hello {{name}}', { name: 'Ada' });
    expect(out).toBe('Hello Ada');
  });

  it('renders html bodies', () => {
    const out = service.render('<p>{{status}}</p>', { status: 'triaged' });
    expect(out).toBe('<p>triaged</p>');
  });
});
