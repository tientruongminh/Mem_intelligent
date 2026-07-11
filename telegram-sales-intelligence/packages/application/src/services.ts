import {
  NotFoundError,
  shouldTriggerSuggestion,
  type ActorContext,
  type DomainRepositories,
  type UUID,
} from '@tsi/domain';
import type {
  AiProvider,
  ObjectStoragePort,
  PasswordHasher,
  QueryPort,
  QueuePort,
  TokenService,
} from './ports.js';

export interface InsightNarrativeResult {
  narratives: Array<{ candidateId: UUID; title: string; description: string }>;
}

export class GenerateDataMiningInsights {
  constructor(
    private readonly query: QueryPort,
    private readonly ai: AiProvider,
    private readonly validateOutput: (value: unknown) => InsightNarrativeResult,
  ) {}

  async execute(input: { actor: ActorContext; generatedAt?: Date }): Promise<any[]> {
    const candidates = await this.query.invoke('calculate-daily-insight-candidates', input.actor, {
      generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    });
    if (!candidates.length) return [];
    const generated = await this.ai.generateStructured<InsightNarrativeResult>({
      schemaName: 'data_mining_insight_narratives',
      systemPrompt:
        'You write concise Vietnamese sales analytics insights. Use only supplied metrics. Never invent, change, round, or extrapolate numbers. Return one narrative per candidateId.',
      input: {
        candidates: candidates.map((candidate: any) => ({
          candidateId: candidate.candidateId,
          method: candidate.method,
          metricName: candidate.metricName,
          metricValue: candidate.metricValue,
          baselineValue: candidate.baselineValue,
          sampleSize: candidate.sampleSize,
          analysis: candidate.analysis,
        })),
      },
      validate: this.validateOutput,
    });
    const narratives = new Map(
      generated.data.narratives.map((narrative) => [narrative.candidateId, narrative]),
    );
    return this.query.invoke('save-daily-insight-candidates', input.actor, {
      modelName: generated.model,
      candidates: candidates.map((candidate: any) => ({
        ...candidate,
        title: narratives.get(candidate.candidateId)?.title ?? candidate.fallbackTitle,
        description:
          narratives.get(candidate.candidateId)?.description ?? candidate.fallbackDescription,
      })),
    });
  }
}

export interface ReplySuggestionAiResult {
  suggestionText: string;
  shortRationale: string;
  confidence: number;
  appointment?: {
    detected: boolean;
    title?: string;
    startAt?: string;
    durationMinutes?: number;
    askEmployeeConfirmation: boolean;
  };
}

export class GenerateReplySuggestion {
  constructor(
    private readonly query: QueryPort,
    private readonly ai: AiProvider,
    private readonly validateOutput: (value: unknown) => ReplySuggestionAiResult,
  ) {}

  async execute(input: { actor: ActorContext; conversationId: UUID }): Promise<any> {
    const context = await this.query.invoke('reply-suggestion-context', input.actor, {
      conversationId: input.conversationId,
    });
    const latestCustomerMessage = [...context.recentMessages]
      .reverse()
      .find((message: any) => message.senderType === 'CUSTOMER');
    if (!latestCustomerMessage) throw new NotFoundError('Customer message');
    const generated = await this.ai.generateStructured<ReplySuggestionAiResult>({
      schemaName: 'reply_suggestion_with_appointment',
      systemPrompt:
        'Suggest a concise Vietnamese reply for the sale. Ground it in the supplied workflow, employee experience and insights. Detect explicit appointments. Never send a message, close a deal, or claim a calendar event was created. If an appointment exists, ask the employee to confirm adding it to Google Calendar.',
      input: context,
      validate: this.validateOutput,
    });
    return this.query.invoke('save-suggestion', input.actor, {
      conversationId: input.conversationId,
      suggestionText: generated.data.suggestionText,
      shortRationale: generated.data.shortRationale,
      confidence: generated.data.confidence,
      basedOnMessageIds: [latestCustomerMessage.id],
      modelName: generated.model,
      metadata: { appointment: generated.data.appointment },
    });
  }
}

export class TriggerReplySuggestion {
  constructor(
    private readonly repositories: DomainRepositories,
    private readonly queue: QueuePort,
  ) {}

  async execute(input: { actor: ActorContext; conversationId: UUID }): Promise<boolean> {
    const conversation = await this.repositories.conversations.findById(
      input.actor.organizationId,
      input.conversationId,
    );
    if (!conversation) throw new NotFoundError('Conversation');
    const messages = await this.repositories.messages.listRecent(
      input.actor.organizationId,
      input.conversationId,
      30,
    );
    const last = messages.at(-1);
    if (!last) return false;
    const existing = await this.repositories.suggestions.findValidForRange(
      input.actor.organizationId,
      input.conversationId,
      last.id,
      last.id,
    );
    if (
      !shouldTriggerSuggestion({ conversation, messages, hasSuggestionForRange: Boolean(existing) })
    ) {
      return false;
    }
    await this.queue.enqueue('reply-suggestion-trigger', 'request', {
      organizationId: input.actor.organizationId,
      employeeId: conversation.employeeId,
      conversationId: conversation.id,
      messageId: last.id,
    });
    return true;
  }
}

export class GenerateDailyReport {
  constructor(
    private readonly query: QueryPort,
    private readonly storage: ObjectStoragePort,
  ) {}

  async execute(input: { actor: ActorContext; reportDate: Date }): Promise<any> {
    const data = await this.query.invoke('daily-report-data', input.actor, {
      reportDate: input.reportDate.toISOString(),
    });
    const year = input.reportDate.getUTCFullYear();
    const month = String(input.reportDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(input.reportDate.getUTCDate()).padStart(2, '0');
    await this.storage.ensureBucket('reports');
    const dateLabel = input.reportDate.toISOString().slice(0, 10);
    const artifacts = [
      {
        id: crypto.randomUUID(),
        format: 'HTML',
        extension: 'html',
        contentType: 'text/html; charset=utf-8',
        body: renderDailyReportHtml(input.reportDate, data),
        title: `Báo cáo điều hành bán hàng ${dateLabel}`,
      },
      {
        id: crypto.randomUUID(),
        format: 'LATEX',
        extension: 'tex',
        contentType: 'application/x-tex; charset=utf-8',
        body: renderDailyReportLatex(input.reportDate, data),
        title: `Báo cáo điều hành bán hàng ${dateLabel} - LaTeX`,
      },
    ];
    return Promise.all(
      artifacts.map(async (artifact) => {
        const objectKey = `organizations/${input.actor.organizationId}/reports/${year}/${month}/${day}/${artifact.id}.${artifact.extension}`;
        const uploaded = await this.storage.upload({
          bucket: 'reports',
          objectKey,
          body: artifact.body,
          contentType: artifact.contentType,
        });
        return this.query.invoke('save-report', input.actor, {
          id: artifact.id,
          reportDate: input.reportDate.toISOString(),
          title: artifact.title,
          format: artifact.format,
          objectKey,
          contentType: artifact.contentType,
          ...uploaded,
        });
      }),
    );
  }
}

function renderDailyReportHtml(date: Date, data: any): string {
  const safe = (value: unknown) =>
    String(value ?? '').replace(
      /[&<>"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
        })[character] ?? character,
    );
  const employeeRows = (data.employeePerformance ?? [])
    .map(
      (employee: any) =>
        `<tr><td>${safe(employee.fullName)}</td><td>${safe(employee.assignedCustomers)}</td><td>${safe(employee.openConversations)}</td><td>${safe(employee.wonCount)}</td><td>${safe(Math.round(employee.conversionRate * 100))}%</td></tr>`,
    )
    .join('');
  const insightRows = (data.topInsights ?? [])
    .map(
      (insight: any) =>
        `<tr><td>${safe(insight.method)}</td><td>${safe(insight.title)}</td><td>${safe(insight.sampleSize)}</td><td>${safe(Math.round((insight.confidenceScore ?? 0) * 100))}%</td></tr>`,
    )
    .join('');
  const attentionRows = (data.attentionConversations ?? [])
    .map(
      (conversation: any) =>
        `<tr><td>${safe(conversation.customer.fullName)}</td><td>${safe(conversation.employee.fullName)}</td><td>${safe(conversation.customer.customerType)}</td><td>${safe(conversation.customer.leadScore)}</td><td>${safe(conversation.lastMessageAt?.toISOString?.() ?? conversation.lastMessageAt)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo điều hành bán hàng</title><style>:root{--ink:#172033;--teal:#087f8c;--line:#dce2e9;--muted:#667085;--canvas:#f5f7fa}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:Arial,sans-serif}.cover{background:#172033;color:white;padding:56px max(6vw,40px)}.cover p{color:#c9d3df}.content{max-width:1180px;margin:0 auto;padding:36px}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.kpi{background:white;border-top:3px solid var(--teal);padding:18px}.kpi strong{display:block;font-size:28px;margin-top:8px}.kpi span{font-size:12px;color:var(--muted);text-transform:uppercase}section{margin-top:32px;background:white;padding:24px}h1{font-size:34px;margin:0}h2{font-size:18px;margin:0 0 18px;border-bottom:1px solid var(--line);padding-bottom:12px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:11px;border-bottom:1px solid var(--line);text-align:left}th{background:#f8fafc;color:var(--muted);font-size:11px;text-transform:uppercase}.note{border-left:3px solid var(--teal);padding:12px 16px;background:#edf8f9;line-height:1.6}@media(max-width:800px){.kpis{grid-template-columns:repeat(2,1fr)}.content{padding:16px}section{overflow-x:auto}}</style></head><body><header class="cover"><p>${safe(data.organizationName)}</p><h1>Báo cáo điều hành bán hàng</h1><p>Kỳ báo cáo ${safe(date.toISOString().slice(0, 10))} · Dữ liệu hội thoại, workflow và outcome đã lưu</p></header><main class="content"><div class="kpis"><div class="kpi"><span>Khách hàng</span><strong>${safe(data.customerCount)}</strong></div><div class="kpi"><span>Đang tư vấn</span><strong>${safe(data.openCount)}</strong></div><div class="kpi"><span>Chốt thành công</span><strong>${safe(data.wonCount)}</strong></div><div class="kpi"><span>Tỷ lệ chốt</span><strong>${safe(Math.round(data.conversionRate * 100))}%</strong></div><div class="kpi"><span>Tin nhắn trong kỳ</span><strong>${safe(data.messageCount)}</strong></div></div><section><h2>Tóm tắt điều hành</h2><p class="note">${safe(data.executiveSummary)}</p></section><section><h2>Hiệu suất đội ngũ</h2><table><thead><tr><th>Nhân viên</th><th>Khách hàng</th><th>Đang tư vấn</th><th>WON</th><th>Conversion</th></tr></thead><tbody>${employeeRows}</tbody></table></section><section><h2>Insight trọng yếu</h2><table><thead><tr><th>Phương pháp</th><th>Kết luận</th><th>Cỡ mẫu</th><th>Độ tin cậy</th></tr></thead><tbody>${insightRows}</tbody></table></section><section><h2>Transaction cần chú ý</h2><table><thead><tr><th>Khách hàng</th><th>Sale</th><th>Phân khúc</th><th>Lead score</th><th>Tin gần nhất</th></tr></thead><tbody>${attentionRows}</tbody></table></section><section><h2>Kiểm soát và phương pháp</h2><p>Dữ liệu định lượng được tính bằng application code từ PostgreSQL. AI chỉ diễn đạt insight và không tự gửi tin, tự tạo lịch hay tự đóng deal.</p></section></main></body></html>`;
}

function renderDailyReportLatex(date: Date, data: any): string {
  const latexCharacters: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    $: '\\$',
    '#': '\\#',
    _: '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  const tex = (value: unknown) =>
    String(value ?? '').replace(/[\\&%$#_{}~^]/g, (character) => latexCharacters[character]!);
  const employeeRows = (data.employeePerformance ?? [])
    .map(
      (employee: any) =>
        `${tex(employee.fullName)} & ${employee.assignedCustomers} & ${employee.openConversations} & ${employee.wonCount} & ${Math.round(employee.conversionRate * 100)}\\% \\\\`,
    )
    .join('\n');
  const insightRows = (data.topInsights ?? [])
    .map(
      (insight: any) =>
        `${tex(insight.method)} & ${tex(insight.title)} & ${insight.sampleSize} & ${Math.round((insight.confidenceScore ?? 0) * 100)}\\% \\\\`,
    )
    .join('\n');
  const attentionRows = (data.attentionConversations ?? [])
    .map(
      (conversation: any) =>
        `${tex(conversation.customer.fullName)} & ${tex(conversation.employee.fullName)} & ${tex(conversation.customer.customerType)} & ${conversation.customer.leadScore ?? 0} \\\\`,
    )
    .join('\n');
  return `\\documentclass[11pt,a4paper]{article}
\\usepackage{fontspec}
\\usepackage[vietnamese]{babel}
\\usepackage[margin=1.8cm]{geometry}
\\usepackage{booktabs,longtable,array,xcolor,colortbl,hyperref,fancyhdr}
\\definecolor{CorporateTeal}{HTML}{087F8C}
\\definecolor{CorporateInk}{HTML}{172033}
\\definecolor{LightGray}{HTML}{F2F5F7}
\\setmainfont{DejaVu Sans}
\\hypersetup{colorlinks=true,linkcolor=CorporateTeal,urlcolor=CorporateTeal}
\\pagestyle{fancy}\\fancyhf{}\\lhead{${tex(data.organizationName)}}\\rhead{Sales Intelligence}\\cfoot{\\thepage}
\\begin{document}
\\begin{titlepage}\\pagecolor{CorporateInk}\\color{white}\\vspace*{3cm}
{\\Large ${tex(data.organizationName)}}\\par\\vspace{1.2cm}
{\\Huge\\bfseries BÁO CÁO ĐIỀU HÀNH BÁN HÀNG}\\par\\vspace{0.7cm}
{\\Large Kỳ báo cáo ${tex(date.toISOString().slice(0, 10))}}\\par\\vfill
{\\large Dữ liệu từ conversation, workflow, insight và outcome đã kiểm chứng}\\par
\\end{titlepage}\\nopagecolor\\color{CorporateInk}
\\section*{Tóm tắt điều hành}
\\colorbox{LightGray}{\\parbox{0.95\\linewidth}{${tex(data.executiveSummary)}}}
\\section*{Chỉ số trọng yếu}
\\begin{tabular}{>{\\bfseries}p{0.34\\linewidth}r}\\toprule
Khách hàng đang quản lý & ${data.customerCount} \\\\ Đang tư vấn & ${data.openCount} \\\\ Chốt thành công & ${data.wonCount} \\\\ Tỷ lệ chốt & ${Math.round(data.conversionRate * 100)}\\% \\\\ Tin nhắn trong kỳ & ${data.messageCount} \\\\ \\bottomrule\\end{tabular}
\\section*{Hiệu suất đội ngũ}
\\rowcolors{2}{LightGray}{white}\\begin{longtable}{p{0.38\\linewidth}rrrr}\\toprule
Nhân viên & Khách & Open & WON & Conversion \\\\ \\midrule\\endhead
${employeeRows}
\\bottomrule\\end{longtable}
\\section*{Insight trọng yếu}
\\rowcolors{2}{LightGray}{white}\\begin{longtable}{p{0.18\\linewidth}p{0.52\\linewidth}rr}\\toprule
Phương pháp & Kết luận & Mẫu & Tin cậy \\\\ \\midrule\\endhead
${insightRows}
\\bottomrule\\end{longtable}
\\section*{Transaction cần chú ý}
\\rowcolors{2}{LightGray}{white}\\begin{longtable}{p{0.30\\linewidth}p{0.30\\linewidth}lr}\\toprule
Khách hàng & Nhân viên & Phân khúc & Score \\\\ \\midrule\\endhead
${attentionRows}
\\bottomrule\\end{longtable}
\\section*{Phương pháp và kiểm soát}
Số liệu được tính bằng application code từ PostgreSQL. AI chỉ diễn đạt insight; hệ thống không cho phép AI tự gửi tin nhắn, tự tạo lịch hoặc tự đóng deal.
\\end{document}`;
}

export class AuthenticateUser {
  constructor(
    private readonly query: QueryPort,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(email: string, password: string): Promise<{ accessToken: string; user: any }> {
    const user = await this.query.loginUserByEmail(email);
    if (!user || !(await this.passwordHasher.verify(user.passwordHash, password))) {
      throw new NotFoundError('Valid credentials');
    }
    const accessToken = await this.tokens.sign({
      sub: user.id,
      organizationId: user.employee.organizationId,
      employeeId: user.employee.id,
      role: user.employee.role,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        employee: user.employee,
      },
    };
  }
}

export class QueryService {
  constructor(private readonly query: QueryPort) {}

  list(resource: string, actor: ActorContext, query?: Record<string, unknown>): Promise<any[]> {
    return this.query.list(resource, actor, query);
  }

  listCollectorSessions(): Promise<any[]> {
    return this.query.listCollectorSessions();
  }

  async get(resource: string, id: UUID, actor: ActorContext): Promise<any> {
    const result = await this.query.get(resource, id, actor);
    if (!result) throw new NotFoundError(resource);
    return result;
  }

  update(
    resource: string,
    id: UUID,
    actor: ActorContext,
    data: Record<string, unknown>,
  ): Promise<any> {
    return this.query.update(resource, id, actor, data);
  }

  invoke(action: string, actor: ActorContext, input: Record<string, unknown>): Promise<any> {
    return this.query.invoke(action, actor, input);
  }
}
