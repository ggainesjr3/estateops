import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerAccountRepository } from '../ledger/repositories/ledger-account.repository';
import { AccountingReportingService } from './accounting-reporting.service';
import {
  CreateInvoiceDto,
  GeneralLedgerQueryDto,
  ListInvoicesQueryDto,
  TrialBalanceQueryDto,
} from './dto/accounting-query.dto';

const ACCOUNTING_ROLES = [
  MembershipRole.ORG_ADMIN,
  MembershipRole.PROPERTY_MANAGER,
  MembershipRole.ACCOUNTANT,
];

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting')
@UseGuards(RolesGuard)
export class AccountingController {
  constructor(
    private readonly reporting: AccountingReportingService,
    private readonly ledgerService: LedgerService,
    private readonly ledgerAccounts: LedgerAccountRepository,
  ) {}

  @Get('dashboard')
  @Roles(...ACCOUNTING_ROLES)
  getDashboard() {
    return this.reporting.getDashboard();
  }

  @Get('invoices')
  @Roles(...ACCOUNTING_ROLES)
  listInvoices(@Query() query: ListInvoicesQueryDto) {
    return this.reporting.listInvoices(query);
  }

  @Post('invoices')
  @Roles(...ACCOUNTING_ROLES)
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.reporting.createInvoice(dto);
  }

  @Get('invoices/:id')
  @Roles(...ACCOUNTING_ROLES)
  getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.reporting.getInvoiceDetail(id);
  }

  @Get('ledger/accounts')
  @Roles(...ACCOUNTING_ROLES)
  async listAccounts() {
    await this.ledgerService.ensureSystemAccounts();
    const accounts = await this.ledgerAccounts.findAllForOrg();
    return accounts.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
    }));
  }

  @Get('ledger/general')
  @Roles(...ACCOUNTING_ROLES)
  getGeneralLedger(@Query() query: GeneralLedgerQueryDto) {
    return this.ledgerService.getGeneralLedger(query.accountId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get('ledger/general/export')
  @Roles(...ACCOUNTING_ROLES)
  @Header('Content-Type', 'text/csv')
  async exportGeneralLedger(
    @Query() query: GeneralLedgerQueryDto,
    @Res() res: Response,
  ) {
    const all: {
      postedAt: string;
      description: string;
      amount: string;
      type: string;
      runningBalance: string;
    }[] = [];
    let cursor = query.cursor;
    for (let i = 0; i < 20; i++) {
      const page = await this.ledgerService.getGeneralLedger(query.accountId, {
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
        cursor,
        limit: 100,
      });
      all.push(
        ...page.items.map((l) => ({
          postedAt: l.postedAt,
          description: l.description,
          amount: l.amount,
          type: l.type,
          runningBalance: l.runningBalance,
        })),
      );
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    const csv = this.reporting.generalLedgerCsv(all);
    res.setHeader('Content-Disposition', 'attachment; filename="general-ledger.csv"');
    res.send(csv);
  }

  @Get('trial-balance')
  @Roles(...ACCOUNTING_ROLES)
  getTrialBalance(@Query() query: TrialBalanceQueryDto) {
    return this.reporting.getTrialBalance(query.asOf);
  }

  @Get('rent-roll')
  @Roles(...ACCOUNTING_ROLES)
  getRentRoll() {
    return this.reporting.getRentRoll();
  }

  @Get('rent-roll/export')
  @Roles(...ACCOUNTING_ROLES)
  @Header('Content-Type', 'text/csv')
  async exportRentRoll(@Res() res: Response) {
    const rows = await this.reporting.getRentRoll();
    const csv = this.reporting.rentRollCsv(rows);
    res.setHeader('Content-Disposition', 'attachment; filename="rent-roll.csv"');
    res.send(csv);
  }
}
