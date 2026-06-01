import { Injectable } from '@nestjs/common';

export interface BrandedEmailContext {
  orgName: string;
  logoUrl: string | null;
  primaryColor: string;
  subject: string;
  bodyHtml: string;
  footerText?: string;
}

@Injectable()
export class BrandedEmailWrapperService {
  wrap(ctx: BrandedEmailContext): { html: string; text: string } {
    const color = ctx.primaryColor || '#0f172a';
    const logo = ctx.logoUrl
      ? `<img src="${ctx.logoUrl}" alt="${ctx.orgName}" style="max-height:48px;margin-bottom:16px" />`
      : `<h1 style="margin:0;color:${color};font-size:20px">${ctx.orgName}</h1>`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden">
    <tr><td style="padding:24px 24px 0;border-bottom:3px solid ${color}">${logo}</td></tr>
    <tr><td style="padding:24px;color:#18181b;line-height:1.6">${ctx.bodyHtml}</td></tr>
    <tr><td style="padding:16px 24px;background:#f4f4f5;font-size:12px;color:#71717a">
      ${ctx.footerText ?? `Sent by ${ctx.orgName} via EstateOps`}
    </td></tr>
  </table>
</body>
</html>`;

    const text = `${ctx.subject}\n\n${stripHtml(ctx.bodyHtml)}\n\n— ${ctx.orgName}`;
    return { html, text };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
