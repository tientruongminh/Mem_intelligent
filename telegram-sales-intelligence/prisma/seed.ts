import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const id = {
  org: '10000000-0000-4000-8000-000000000001',
  adminUser: '10000000-0000-4000-8000-000000000002',
  saleUser: '10000000-0000-4000-8000-000000000003',
  admin: '10000000-0000-4000-8000-000000000004',
  sale: '10000000-0000-4000-8000-000000000005',
  session: '10000000-0000-4000-8000-000000000006',
  customerA: '10000000-0000-4000-8000-000000000007',
  customerB: '10000000-0000-4000-8000-000000000008',
  openConversation: '10000000-0000-4000-8000-000000000009',
  wonConversation: '10000000-0000-4000-8000-000000000010',
  openGraph: '10000000-0000-4000-8000-000000000011',
  wonGraph: '10000000-0000-4000-8000-000000000012',
  report: '10000000-0000-4000-8000-000000000013',
};

function stableId(scope: string, index: number): string {
  const hex = createHash('sha256').update(`${scope}:${index}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function workflowBlueprint(segment?: string) {
  const enterprise = segment === 'Enterprise';
  return [
    {
      stage: 'Khám phá bối cảnh',
      observedBehavior: segment
        ? `Khách ${segment} chia sẻ mục tiêu, quy mô và hệ thống hiện tại.`
        : 'Khách chia sẻ quy mô, hệ thống hiện tại và mục tiêu kinh doanh.',
      employeeAction: enterprise
        ? 'Xác định sponsor, decision maker, IT và procurement ngay từ đầu.'
        : 'Đặt câu hỏi định lượng về đội sales, số lead và tỷ lệ bỏ quên.',
      customerSignal: 'Khách trả lời bằng số liệu hoặc mô tả một vấn đề đang gây chi phí.',
      recommendedResponse: 'Nhắc lại vấn đề bằng ngôn ngữ của khách và xác nhận mức ưu tiên.',
      exitCriteria: 'Có pain point, tác động, người sở hữu và mức độ cấp thiết rõ ràng.',
      commonFailure: 'Giới thiệu tính năng trước khi hiểu bối cảnh.',
    },
    {
      stage: 'Xác nhận nhu cầu',
      observedBehavior: 'Khách hỏi cách hệ thống xử lý workflow, dữ liệu hoặc use case cụ thể.',
      employeeAction: enterprise
        ? 'Dùng solution map, kiến trúc tích hợp và control bảo mật.'
        : 'Liên kết từng nhu cầu với một use case, không liệt kê toàn bộ tính năng.',
      customerSignal: 'Khách yêu cầu demo hoặc đưa ra tiêu chí thành công.',
      recommendedResponse: 'Chốt 2-3 tiêu chí nghiệm thu cho demo hoặc pilot.',
      exitCriteria: 'Hai bên thống nhất phạm vi giải pháp cần đánh giá.',
      commonFailure: 'Demo chung chung, không dùng dữ liệu hoặc quy trình của khách.',
    },
    {
      stage: 'Xử lý rào cản',
      observedBehavior: 'Khách nêu ngân sách, bảo mật, tích hợp, adoption hoặc timeline.',
      employeeAction: 'Phân loại objection, trả lời bằng evidence và đưa phương án giảm rủi ro.',
      customerSignal: 'Khách chuyển từ phản đối sang hỏi điều kiện triển khai.',
      recommendedResponse: enterprise
        ? 'Đề xuất workshop kỹ thuật, security checklist và pilot có tiêu chí nghiệm thu.'
        : 'Đề xuất pilot nhỏ tạo giá trị trong hai tuần và chi phí có giới hạn.',
      exitCriteria: 'Rào cản có owner và hành động xử lý tiếp theo.',
      commonFailure: 'Giảm giá ngay khi chưa xác định nguyên nhân phản đối.',
    },
    {
      stage: 'Tiến tới quyết định',
      observedBehavior: 'Khách trao đổi stakeholder, proposal, lịch demo hoặc quy trình phê duyệt.',
      employeeAction: 'Chốt người tham dự, thời gian, đầu ra và điều kiện ra quyết định.',
      customerSignal: 'Khách xác nhận lịch hoặc cam kết cung cấp dữ liệu.',
      recommendedResponse: 'Tạo mutual action plan và xác nhận deadline của cả hai bên.',
      exitCriteria: 'Có lịch, owner, deliverable và ngày quyết định cụ thể.',
      commonFailure: 'Kết thúc bằng câu follow-up nhưng không có thời hạn.',
    },
  ];
}

function primaryCustomerProfile(input: {
  fullName: string;
  companyName: string;
  segment: string;
  product: string;
  leadScore: number;
}) {
  return {
    identity: {
      fullName: input.fullName,
      role: 'Sales Director',
      location: 'TP. Hồ Chí Minh',
      preferredChannel: 'Telegram',
    },
    businessContext: {
      companyName: input.companyName,
      industry: 'Công nghệ và dịch vụ',
      segment: input.segment,
      employeeCount: input.segment === 'Enterprise' ? 650 : 85,
      salesTeamSize: input.segment === 'Enterprise' ? 72 : 18,
      currentSystem: 'CRM nội bộ kết hợp Telegram và bảng tính',
    },
    needs: {
      primaryGoal: 'Nhìn thấy toàn bộ quá trình tư vấn đến chốt deal',
      painPoints: ['Khách hàng bị bỏ quên', 'Không đánh giá được chất lượng tư vấn'],
      successCriteria: ['Giảm 30% thời gian phản hồi', 'Tăng 15% tỷ lệ chốt'],
      urgency: 'Triển khai pilot trong tháng này',
    },
    interestedSolutions: {
      primaryProduct: input.product,
      relatedProducts: ['AI Sales Assistant', 'Sales Analytics'],
      priorityFeatures: ['Workflow có evidence', 'Insight tự động', 'Daily report'],
    },
    budgetAndPurchase: {
      estimatedBudget:
        input.segment === 'Enterprise' ? '300-500 triệu VND/năm' : '100-180 triệu VND/năm',
      budgetStatus: 'Đang phê duyệt',
      purchaseAuthority: 'Người đề xuất, có ảnh hưởng cao',
      purchaseProbability: input.leadScore / 100,
    },
    concernsAndBarriers: {
      primaryConcern: 'Bảo mật và khả năng tích hợp dữ liệu cũ',
      objections: ['Thời gian triển khai', 'Khả năng adoption của đội sales'],
      blockers: ['Cần security review và xác nhận ngân sách'],
      riskLevel: 'Trung bình',
    },
    communicationBehavior: {
      style: 'Thiên về số liệu, muốn câu trả lời ngắn và có bằng chứng',
      preferredContactTime: '14:00-17:00',
      averageResponseMinutes: 12,
      sentiment: 'Tích cực nhưng thận trọng',
    },
    engagementAndClosing: {
      leadScore: input.leadScore,
      temperature: input.leadScore >= 80 ? 'Hot' : 'Warm',
      intentSignals: ['Đã yêu cầu demo', 'Đã trao đổi ngân sách và timeline'],
      nextBestAction: 'Workshop kỹ thuật và thống nhất phạm vi pilot',
    },
    decisionProcess: {
      currentStage: 'Đánh giá giải pháp',
      decisionMaker: `Ban điều hành ${input.companyName}`,
      stakeholders: ['Sales Director', 'CTO', 'Finance Manager', 'Procurement'],
      expectedDecisionDate: '2026-07-28',
      requiredSteps: ['Demo', 'Security review', 'Duyệt ngân sách', 'Ký pilot'],
    },
    profileMeta: { completeness: 0.94, source: 'conversation-and-workflow-seed' },
  };
}

function customerDetailProfileSeed(input: {
  fullName: string;
  telegramUsername?: string | null;
  phone?: string | null;
  customerType?: string | null;
  productInterest?: string | null;
  leadScore?: number | null;
  index: number;
}) {
  const segments = ['SME', 'Enterprise', 'Startup', 'Individual'];
  const products = [
    'Sales CRM',
    'Conversation Intelligence',
    'AI Sales Assistant',
    'Sales Analytics',
  ];
  const industries = ['SaaS', 'Bán lẻ', 'Giáo dục', 'Logistics', 'Tài chính'];
  const roles = ['Sales Director', 'CEO', 'Head of Operations', 'CRM Manager', 'Business Owner'];
  const cities = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'];
  const segment = input.customerType ?? segments[input.index % segments.length]!;
  const product = input.productInterest ?? products[input.index % products.length]!;
  const leadScore = input.leadScore ?? 62 + ((input.index * 7) % 34);
  const companyName = `${['An Phát', 'Minh Việt', 'Horizon', 'Nova', 'Đại Dương'][input.index % 5]} ${
    ['Digital', 'Group', 'Solutions', 'Retail', 'Services'][input.index % 5]
  }`;
  const salesTeamSize =
    segment === 'Enterprise'
      ? 55 + (input.index % 30)
      : segment === 'SME'
        ? 12 + (input.index % 18)
        : 5 + (input.index % 8);
  const budget =
    segment === 'Enterprise'
      ? '300-600 triệu VND/năm'
      : segment === 'SME'
        ? '90-180 triệu VND/năm'
        : '35-80 triệu VND/năm';

  return {
    identity: {
      fullName: input.fullName,
      preferredName: input.fullName.split(' ').slice(-2).join(' '),
      role: roles[input.index % roles.length],
      phone:
        input.phone ?? `+848${input.index % 10}***${String(420 + input.index).padStart(3, '0')}`,
      telegram: input.telegramUsername ? `@${input.telegramUsername}` : 'Telegram private chat',
      location: cities[input.index % cities.length],
      preferredChannel: 'Telegram',
    },
    businessContext: {
      companyName,
      industry: industries[input.index % industries.length],
      segment,
      employeeCount:
        segment === 'Enterprise'
          ? 450 + input.index * 3
          : segment === 'SME'
            ? 60 + input.index
            : 12 + input.index,
      salesTeamSize,
      currentSystem:
        input.index % 3 === 0
          ? 'Telegram + bảng tính + CRM nội bộ'
          : input.index % 3 === 1
            ? 'HubSpot nhưng chưa đồng bộ hội thoại'
            : 'Quản lý thủ công trên Telegram',
      operatingMarket: input.index % 2 === 0 ? 'Toàn quốc' : 'Nội địa',
    },
    needs: {
      primaryGoal: 'Chuẩn hóa dữ liệu tư vấn để nhìn rõ tiến trình từ hỏi nhu cầu đến chốt deal',
      painPoints: [
        'Khó theo dõi khách hàng nào cần follow-up',
        'Không có evidence rõ cho từng bước tư vấn',
        'Quản lý không nhìn thấy chất lượng hội thoại theo thời gian thực',
      ],
      successCriteria: [
        'Giảm thời gian phản hồi dưới 10 phút',
        'Tăng tỷ lệ chốt bằng kịch bản tư vấn theo từng nhóm khách',
        'Có báo cáo cuối ngày cho quản lý sales',
      ],
      urgency:
        input.index % 2 === 0 ? 'Muốn pilot trong tháng này' : 'Cần demo trước khi duyệt ngân sách',
    },
    interestedSolutions: {
      primaryProduct: product,
      relatedProducts: ['AI Sales Assistant', 'Customer Data Platform', 'Daily Sales Report'],
      priorityFeatures: [
        'Tự động lấy hội thoại Telegram',
        'Workflow node/edge có reference tin nhắn',
        'AI gợi ý câu trả lời cho sale',
        'Insight data mining theo customer segment',
      ],
      alternativesConsidered:
        input.index % 2 === 0 ? ['HubSpot', 'Zoho CRM'] : ['CRM nội bộ', 'Google Sheet'],
    },
    budgetAndPurchase: {
      estimatedBudget: budget,
      budgetStatus: leadScore >= 80 ? 'Đã có ngân sách thử nghiệm' : 'Đang xin phê duyệt',
      purchaseAuthority:
        segment === 'Enterprise'
          ? 'Người đề xuất, cần CTO/CFO duyệt'
          : 'Có ảnh hưởng trực tiếp đến quyết định mua',
      paymentPreference:
        segment === 'Enterprise'
          ? 'Pilot 2-3 tháng rồi ký năm'
          : 'Gói theo tháng, mở rộng sau pilot',
      purchaseProbability: Math.min(0.96, Math.max(0.35, leadScore / 100)),
    },
    concernsAndBarriers: {
      primaryConcern:
        input.index % 3 === 0
          ? 'Bảo mật Telegram session và phân quyền dữ liệu'
          : input.index % 3 === 1
            ? 'Khả năng adoption của đội sales'
            : 'Chi phí triển khai và tích hợp dữ liệu cũ',
      objections: [
        'Không muốn sale thay đổi cách chat hiện tại',
        'Cần thấy rõ dữ liệu nào được AI dùng để kết luận',
        'Muốn kiểm soát quyền truy cập theo từng nhân viên',
      ],
      blockers:
        segment === 'Enterprise'
          ? ['Security review', 'Procurement review']
          : ['Cần demo theo dữ liệu thật', 'Cần thống nhất ngân sách pilot'],
      riskLevel: leadScore >= 82 ? 'Thấp' : leadScore >= 65 ? 'Trung bình' : 'Cao',
    },
    communicationBehavior: {
      style:
        input.index % 3 === 0
          ? 'Ngắn gọn, hỏi thẳng chi phí và timeline'
          : input.index % 3 === 1
            ? 'Cần số liệu, bằng chứng và ví dụ thực tế'
            : 'Thích được hướng dẫn từng bước theo workflow',
      preferredContactTime: input.index % 2 === 0 ? '09:00-11:00' : '14:00-17:00',
      averageResponseMinutes: 8 + (input.index % 28),
      sentiment:
        leadScore >= 80 ? 'Tích cực, có ý định thử nghiệm' : 'Quan tâm nhưng còn thận trọng',
    },
    engagementAndClosing: {
      leadScore,
      temperature: leadScore >= 82 ? 'Hot' : leadScore >= 66 ? 'Warm' : 'Nurture',
      intentSignals: [
        'Đã hỏi về demo hoặc báo giá',
        'Đã nêu pain point vận hành sales',
        'Có phản hồi về timeline triển khai',
      ],
      nextBestAction:
        leadScore >= 82
          ? 'Chốt lịch demo theo workflow thật và gửi proposal pilot'
          : 'Gửi case study ngắn, sau đó xác nhận người duyệt ngân sách',
    },
    decisionProcess: {
      currentStage: leadScore >= 80 ? 'Đánh giá giải pháp' : 'Khám phá nhu cầu',
      decisionMaker: segment === 'Enterprise' ? `Ban điều hành ${companyName}` : input.fullName,
      stakeholders:
        segment === 'Enterprise'
          ? ['Sales Director', 'CTO', 'Finance Manager', 'Procurement']
          : ['Business Owner', 'Sales Lead'],
      expectedDecisionDate: `2026-07-${String(18 + (input.index % 10)).padStart(2, '0')}`,
      requiredSteps:
        segment === 'Enterprise'
          ? ['Demo nghiệp vụ', 'Security review', 'Duyệt ngân sách', 'Ký pilot']
          : ['Demo nhanh', 'Chốt phạm vi pilot', 'Xác nhận chi phí'],
    },
    profileMeta: {
      completeness: 0.86 + (input.index % 10) / 100,
      source: 'seed-data + conversation workflow demo',
      updatedAt: new Date('2026-07-12T01:00:00Z').toISOString(),
    },
  };
}

async function enrichMissingCustomerDetailProfiles() {
  const customers = await prisma.customer.findMany({
    where: {
      organizationId: id.org,
      OR: [
        { profileJson: { equals: null } },
        { customerType: null },
        { productInterest: null },
        { leadScore: null },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  const segments = ['SME', 'Enterprise', 'Startup', 'Individual'];
  const products = [
    'Sales CRM',
    'Conversation Intelligence',
    'AI Sales Assistant',
    'Sales Analytics',
  ];
  for (const [index, customer] of customers.entries()) {
    const customerType = customer.customerType ?? segments[index % segments.length]!;
    const productInterest = customer.productInterest ?? products[(index + 1) % products.length]!;
    const leadScore = customer.leadScore ?? 64 + ((index * 11) % 31);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        customerType,
        productInterest,
        leadScore,
        notes:
          customer.notes ??
          'Seed profile demo: thông tin được tổng hợp từ hội thoại Telegram, workflow và insight mẫu.',
        profileJson:
          customer.profileJson ??
          customerDetailProfileSeed({
            fullName: customer.fullName,
            telegramUsername: customer.telegramUsername,
            phone: customer.phone,
            customerType,
            productInterest,
            leadScore,
            index,
          }),
      },
    });
  }
}

async function seedRealisticSalesRoom(passwordHash: string) {
  const saleNames = [
    'Nguyễn Minh Sale',
    'Lê Hoàng Nam',
    'Phạm Thu Trang',
    'Đỗ Gia Huy',
    'Vũ Ngọc Mai',
    'Trần Quốc Bảo',
    'Bùi Thanh Vy',
    'Hoàng Đức Anh',
  ];
  const segments = ['Startup', 'SME', 'Enterprise', 'Individual'];
  const products = [
    'Sales CRM',
    'Conversation Intelligence',
    'Customer Data Platform',
    'AI Sales Assistant',
  ];
  saleNames.push(
    'Ngô Hải Yến',
    'Dương Minh Khôi',
    'Đặng Mỹ Linh',
    'Phan Thành Công',
    'Võ Quỳnh Anh',
    'Mai Nhật Long',
    'Trịnh Bảo Châu',
  );
  products.push('Sales Analytics', 'Omnichannel Support');
  const cleanFamilyNames = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Huỳnh',
    'Phan',
    'Vũ',
    'Võ',
    'Đặng',
    'Bùi',
    'Đỗ',
  ];
  const cleanGivenNames = [
    'Anh Khoa',
    'Minh Châu',
    'Quang Huy',
    'Thu Hương',
    'Gia Bảo',
    'Khánh Linh',
    'Tuấn Kiệt',
    'Phương Thảo',
  ];
  const industries = [
    'Bán lẻ',
    'Tài chính',
    'Giáo dục',
    'Logistics',
    'SaaS',
    'Sản xuất',
    'Y tế',
    'Bất động sản',
  ];
  const companyPrefixes = ['An Phát', 'Minh Việt', 'Nova', 'Thành Công', 'Horizon', 'Đại Dương'];
  const companySuffixes = ['Technology', 'Group', 'Solutions', 'Retail', 'Services', 'Digital'];
  const saleIds = [id.sale, ...saleNames.slice(1).map((_, index) => stableId('employee', index))];

  await prisma.user.createMany({
    data: saleNames.slice(1).map((name, index) => ({
      id: stableId('sale-user', index),
      email: `sale${index + 2}@demo.local`,
      passwordHash,
      fullName: name,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
  await prisma.employee.createMany({
    data: saleNames.slice(1).map((name, index) => ({
      id: saleIds[index + 1]!,
      organizationId: id.org,
      userId: stableId('sale-user', index),
      employeeCode: `SALE-${String(index + 2).padStart(3, '0')}`,
      fullName: name,
      email: `sale${index + 2}@demo.local`,
      phone: `+849${index + 1}***${String(120 + index).padStart(3, '0')}`,
      role: 'SALE' as const,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });

  const extraSessionIds = saleIds.slice(1).map((_, index) => stableId('telegram-session', index));
  await prisma.telegramUserSession.createMany({
    data: saleIds.slice(1).map((employeeId, index) => ({
      id: extraSessionIds[index]!,
      organizationId: id.org,
      employeeId,
      telegramUserId: String(110000 + index),
      phoneMasked: `+849${index + 1}***${String(120 + index).padStart(3, '0')}`,
      username: `demo_sale_${index + 2}`,
      status: 'CONNECTED' as const,
      lastSyncedAt: new Date(`2026-07-${String(10 + (index % 2)).padStart(2, '0')}T09:00:00Z`),
    })),
    skipDuplicates: true,
  });

  const customerIds: string[] = [];
  const conversationIds: string[] = [];
  const graphIds: string[] = [];
  const nodeIds: string[] = [];
  const messageIds: string[] = [];
  const customers: any[] = [];
  const conversations: any[] = [];
  const messages: any[] = [];
  const summaries: any[] = [];
  const graphs: any[] = [];
  const nodes: any[] = [];
  const edges: any[] = [];
  const evidences: any[] = [];
  const baseDate = new Date('2026-05-15T01:00:00Z').getTime();

  for (let index = 0; index < 248; index += 1) {
    const customerId = stableId('bulk-customer', index);
    const conversationId = stableId('bulk-conversation', index);
    const graphId = stableId('bulk-graph', index);
    const employeeId = saleIds[index % saleIds.length]!;
    const sessionId =
      employeeId === id.sale ? id.session : extraSessionIds[(index % saleIds.length) - 1]!;
    const segment = segments[index % segments.length]!;
    const product = products[(index * 3) % products.length]!;
    const startedAt = new Date(baseDate + index * 4 * 60 * 60 * 1000);
    const status = index % 5 === 0 ? 'OPEN' : 'CLOSED';
    const outcome =
      status === 'OPEN' ? 'NONE' : index % 4 === 0 ? 'LOST' : index % 6 === 0 ? 'STOPPED' : 'WON';
    const customerName = `${cleanFamilyNames[index % cleanFamilyNames.length]} ${cleanGivenNames[(index * 5) % cleanGivenNames.length]}`;
    const companyName = `${companyPrefixes[index % companyPrefixes.length]} ${companySuffixes[(index * 3) % companySuffixes.length]}`;
    const industry = industries[(index * 5) % industries.length]!;
    const teamSize = 5 + ((index * 7) % 196);
    const role = ['CEO', 'Sales Director', 'Head of Operations', 'CRM Manager', 'Business Owner'][
      index % 5
    ]!;
    const budgetMin = 30 + (index % 8) * 20;
    const budgetMax = budgetMin + 40 + (index % 5) * 20;
    const primaryConcern = [
      'Ngân sách',
      'Bảo mật dữ liệu',
      'Thời gian triển khai',
      'Khả năng tích hợp',
    ][index % 4]!;
    const decisionStage = [
      'Khám phá',
      'Đánh giá giải pháp',
      'So sánh nhà cung cấp',
      'Phê duyệt nội bộ',
    ][index % 4]!;
    const lastMessageAt = new Date(startedAt.getTime() + 95 * 60 * 1000);
    const closedAt =
      status === 'CLOSED'
        ? new Date(startedAt.getTime() + (18 + (index % 96)) * 60 * 60 * 1000)
        : null;

    customerIds.push(customerId);
    conversationIds.push(conversationId);
    graphIds.push(graphId);
    customers.push({
      id: customerId,
      organizationId: id.org,
      ownerEmployeeId: employeeId,
      fullName: customerName,
      telegramUserId: String(300000 + index),
      telegramUsername: `customer_${String(index + 1).padStart(2, '0')}`,
      phone: `+848${index % 10}***${String(500 + index).padStart(3, '0')}`,
      customerType: segment,
      productInterest: product,
      leadScore: 38 + ((index * 13) % 61),
      notes:
        index % 3 === 0
          ? 'Ưu tiên triển khai nhanh và cần tích hợp dữ liệu cũ.'
          : 'Theo dõi qua Telegram.',
      firstContactAt: startedAt,
      lastContactAt: lastMessageAt,
      profileJson: {
        identity: {
          fullName: customerName,
          preferredName: cleanGivenNames[(index * 5) % cleanGivenNames.length],
          role,
          phone: `+848${index % 10}***${String(500 + index).padStart(3, '0')}`,
          telegram: `@customer_${String(index + 1).padStart(3, '0')}`,
          location: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'][index % 4],
        },
        businessContext: {
          companyName,
          industry,
          segment,
          employeeCount: teamSize * (segment === 'Enterprise' ? 8 : segment === 'SME' ? 3 : 1),
          salesTeamSize: teamSize,
          currentSystem: [
            'Excel và Telegram',
            'HubSpot',
            'CRM nội bộ',
            'Chưa có hệ thống tập trung',
          ][index % 4],
          operatingMarket: index % 3 === 0 ? 'Toàn quốc' : 'Nội địa',
        },
        needs: {
          primaryGoal: 'Chuẩn hóa quá trình tư vấn và giảm khách hàng bị bỏ quên',
          painPoints: [
            'Khó kiểm soát chất lượng tư vấn',
            'Không nhìn thấy trạng thái deal theo thời gian thực',
            index % 2 === 0 ? 'Dữ liệu nằm rải rác' : 'Follow-up phụ thuộc vào ghi nhớ của sale',
          ],
          successCriteria: [
            `Giảm ${15 + (index % 6) * 5}% thời gian phản hồi`,
            `Tăng ${8 + (index % 5) * 3}% tỷ lệ chốt`,
          ],
          urgency: index % 5 === 0 ? 'Trong tháng này' : 'Trong quý tới',
        },
        interestedSolutions: {
          primaryProduct: product,
          relatedProducts: [
            products[(index + 1) % products.length],
            products[(index + 3) % products.length],
          ],
          priorityFeatures: ['Workflow có evidence', 'AI gợi ý phản hồi', 'Dashboard quản lý'],
          alternativesConsidered:
            index % 3 === 0 ? ['HubSpot', 'Zoho CRM'] : ['Tự phát triển nội bộ'],
        },
        budgetAndPurchase: {
          estimatedBudget: `${budgetMin}-${budgetMax} triệu VND/năm`,
          budgetStatus: index % 4 === 0 ? 'Đã được phê duyệt' : 'Đang lập ngân sách',
          purchaseAuthority:
            role === 'CEO' || role === 'Business Owner' ? 'Người quyết định' : 'Người đề xuất',
          paymentPreference: index % 2 === 0 ? 'Thanh toán theo năm' : 'Pilot trước, mở rộng sau',
          purchaseProbability: 0.42 + ((index * 7) % 52) / 100,
        },
        concernsAndBarriers: {
          primaryConcern,
          objections: [
            primaryConcern,
            index % 2 === 0 ? 'Khả năng người dùng thích nghi' : 'Nguồn lực triển khai',
          ],
          blockers: index % 5 === 0 ? ['Chờ phê duyệt CFO'] : ['Cần workshop kỹ thuật'],
          riskLevel: index % 7 === 0 ? 'Cao' : index % 3 === 0 ? 'Trung bình' : 'Thấp',
        },
        communicationBehavior: {
          style: [
            'Ngắn gọn, trực tiếp',
            'Thiên về số liệu',
            'Cần giải thích chi tiết',
            'Ưu tiên ví dụ thực tế',
          ][index % 4],
          preferredChannel: 'Telegram',
          preferredContactTime: index % 2 === 0 ? '09:00-11:00' : '14:00-17:00',
          averageResponseMinutes: 8 + (index % 55),
          sentiment: index % 6 === 0 ? 'Thận trọng' : 'Tích cực',
        },
        engagementAndClosing: {
          leadScore: 38 + ((index * 13) % 61),
          temperature: index % 5 === 0 ? 'Hot' : index % 3 === 0 ? 'Warm' : 'Nurture',
          intentSignals: [
            'Yêu cầu demo',
            index % 4 === 0 ? 'Hỏi ngân sách' : 'Hỏi timeline triển khai',
          ],
          nextBestAction:
            index % 4 === 0
              ? 'Gửi business case theo ngân sách'
              : 'Tổ chức demo theo quy trình thực tế',
        },
        decisionProcess: {
          currentStage: decisionStage,
          decisionMaker: role === 'CEO' ? customerName : `Ban điều hành ${companyName}`,
          stakeholders: [role, 'IT Manager', 'Finance Manager'],
          expectedDecisionDate: `2026-07-${String(15 + (index % 14)).padStart(2, '0')}`,
          requiredSteps: ['Demo nghiệp vụ', 'Đánh giá kỹ thuật', 'Duyệt ngân sách', 'Ký hợp đồng'],
        },
        profileMeta: {
          completeness: 0.78 + (index % 19) / 100,
          source: 'conversation-and-workflow-seed',
          updatedAt: lastMessageAt.toISOString(),
        },
      },
    });
    conversations.push({
      id: conversationId,
      organizationId: id.org,
      customerId,
      employeeId,
      status,
      outcome,
      startedAt,
      lastCustomerMessageAt: lastMessageAt,
      lastSaleMessageAt: new Date(lastMessageAt.getTime() - 8 * 60 * 1000),
      lastMessageAt,
      closedAt,
      closedByEmployeeId: closedAt ? employeeId : null,
      closeReason:
        outcome === 'WON'
          ? 'Khách xác nhận triển khai.'
          : outcome === 'LOST'
            ? 'Ngân sách chưa phù hợp.'
            : outcome === 'STOPPED'
              ? 'Khách tạm dừng kế hoạch.'
              : null,
    });

    const appointmentText =
      index % 7 === 0
        ? `Mình hẹn demo lúc 14:30 ngày ${String(18 + (index % 8)).padStart(2, '0')}/07/2026 nhé.`
        : 'Bên bạn có thể cho mình xem demo theo quy trình hiện tại không?';
    const script = [
      ['CUSTOMER', `Chào bạn, bên mình là ${segment} và đang tìm hiểu ${product}.`],
      ['EMPLOYEE', `Mình muốn hiểu rõ quy mô và mục tiêu để tư vấn ${product} sát hơn.`],
      [
        'CUSTOMER',
        `Đội hiện có ${5 + (index % 45)} người, khó kiểm soát follow-up và chất lượng tư vấn.`,
      ],
      [
        'EMPLOYEE',
        'Hệ thống lưu hội thoại, dựng workflow có evidence và cảnh báo khách cần theo dõi.',
      ],
      [
        'CUSTOMER',
        index % 4 === 0
          ? 'Chi phí có vượt ngân sách 80 triệu không?'
          : 'Thời gian triển khai và tích hợp dữ liệu mất bao lâu?',
      ],
      [
        'EMPLOYEE',
        index % 4 === 0
          ? 'Mình có gói pilot theo quy mô để kiểm chứng hiệu quả trước.'
          : 'Pilot thường hoàn tất trong 2 tuần, sau đó mở rộng theo dữ liệu thực tế.',
      ],
      ['CUSTOMER', appointmentText],
      [
        'EMPLOYEE',
        outcome === 'WON'
          ? 'Mình xác nhận lịch và gửi proposal, phạm vi pilot ngay hôm nay.'
          : 'Mình gửi tài liệu và thống nhất bước tiếp theo sau buổi demo nhé.',
      ],
    ] as const;
    const localMessageIds: string[] = [];
    script.forEach(([senderType, textContent], messageIndex) => {
      const messageId = stableId(`bulk-message-${index}`, messageIndex);
      localMessageIds.push(messageId);
      messageIds.push(messageId);
      messages.push({
        id: messageId,
        organizationId: id.org,
        conversationId,
        telegramUserSessionId: sessionId,
        telegramMessageId: `bulk-${index}-${messageIndex}`,
        senderType,
        senderEmployeeId: senderType === 'EMPLOYEE' ? employeeId : null,
        senderCustomerId: senderType === 'CUSTOMER' ? customerId : null,
        messageType: 'TEXT',
        textContent,
        sentAt: new Date(startedAt.getTime() + messageIndex * 12 * 60 * 1000),
        rawPayloadJson: { seeded: true, scenario: index % 4 },
      });
    });
    summaries.push({
      id: stableId('bulk-summary', index),
      organizationId: id.org,
      conversationId,
      version: 1,
      summaryText: `${customerName} (${segment}) quan tâm ${product}, ưu tiên ${index % 4 === 0 ? 'ngân sách' : 'tốc độ triển khai'} và đã trao đổi bước demo/pilot.`,
      customerNeedsJson: ['follow-up visibility', 'conversation quality', product],
      customerConcernsJson: [index % 4 === 0 ? 'budget' : 'implementation_time'],
      productsJson: [product],
      commitmentsJson: outcome === 'WON' ? ['Xác nhận triển khai pilot'] : [],
      nextActionsJson: status === 'OPEN' ? ['Follow-up sau demo', 'Gửi proposal'] : [],
      modelName: 'seed-analytics-v2',
      promptVersion: 'summary-v2',
    });
    graphs.push({
      id: graphId,
      organizationId: id.org,
      conversationId,
      currentRevision: 4,
      status: status === 'OPEN' ? 'ACTIVE' : 'COMPLETED',
    });

    const stageData = [
      [
        'Khám phá bối cảnh vận hành',
        'Khách mô tả quy mô, loại hình và sản phẩm đang quan tâm.',
        localMessageIds[0],
      ],
      [
        'Làm rõ vấn đề cần giải quyết',
        'Sale xác định khó khăn về follow-up và chất lượng tư vấn.',
        localMessageIds[2],
      ],
      [
        index % 4 === 0 ? 'Đánh giá ngân sách' : 'Đánh giá khả năng triển khai',
        index % 4 === 0
          ? 'Khách đặt giới hạn ngân sách và hỏi phương án pilot.'
          : 'Khách hỏi timeline và tích hợp dữ liệu.',
        localMessageIds[4],
      ],
      [
        'Thống nhất bước tiếp theo',
        outcome === 'WON'
          ? 'Hai bên xác nhận proposal và phạm vi pilot.'
          : 'Hai bên thống nhất demo và follow-up.',
        localMessageIds[6],
      ],
    ] as const;
    const localNodeIds: string[] = [];
    stageData.forEach(([title, description, evidenceMessageId], nodeIndex) => {
      const nodeId = stableId(`bulk-node-${index}`, nodeIndex);
      localNodeIds.push(nodeId);
      nodeIds.push(nodeId);
      nodes.push({
        id: nodeId,
        organizationId: id.org,
        workflowGraphId: graphId,
        title,
        description,
        shortSummary: title,
        confidence: 0.78 + ((index + nodeIndex) % 19) / 100,
        metadataJson: {
          customerIntent:
            nodeIndex === 2
              ? 'evaluate_solution'
              : nodeIndex === 3
                ? 'agree_next_step'
                : 'discover',
          customerSegment: segment,
          mentionedProducts: [product],
          concern: index % 4 === 0 ? 'budget' : 'implementation_time',
          position: { x: nodeIndex * 320, y: (index % 3) * 25 },
          ...(nodeIndex === 3 && index % 7 === 0
            ? {
                appointment: {
                  detected: true,
                  title: `Demo ${product} với ${customerName}`,
                  startAt: `2026-07-${String(18 + (index % 8)).padStart(2, '0')}T14:30:00+07:00`,
                  durationMinutes: 45,
                  status: 'NEEDS_CONFIRMATION',
                },
              }
            : {}),
        },
        isAiGenerated: true,
        isLocked: nodeIndex === 3 && outcome === 'WON',
      });
      evidences.push({
        id: stableId(`bulk-evidence-${index}`, nodeIndex),
        organizationId: id.org,
        workflowNodeId: nodeId,
        messageId: evidenceMessageId,
        evidenceRole: 'PRIMARY',
        excerpt: script[nodeIndex === 0 ? 0 : nodeIndex === 1 ? 2 : nodeIndex === 2 ? 4 : 6]![1],
        relevanceScore: 0.84 + ((index + nodeIndex) % 12) / 100,
      });
    });
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      edges.push({
        id: stableId(`bulk-edge-${index}`, edgeIndex),
        organizationId: id.org,
        workflowGraphId: graphId,
        fromNodeId: localNodeIds[edgeIndex]!,
        toNodeId: localNodeIds[edgeIndex + 1]!,
        label: ['Vấn đề được xác nhận', 'Chuyển sang đánh giá', 'Đồng ý bước tiếp theo'][
          edgeIndex
        ]!,
        description: 'Quan hệ được suy ra từ thứ tự và nội dung hội thoại.',
        confidence: 0.82 + ((index + edgeIndex) % 14) / 100,
        metadataJson: { direction: 'FORWARD', seeded: true },
      });
    }
  }

  await prisma.customer.createMany({ data: customers, skipDuplicates: true });
  for (let offset = 0; offset < customers.length; offset += 40) {
    await prisma.$transaction(
      customers.slice(offset, offset + 40).map((customer) =>
        prisma.customer.update({
          where: { id: customer.id },
          data: {
            fullName: customer.fullName,
            telegramUsername: customer.telegramUsername,
            phone: customer.phone,
            customerType: customer.customerType,
            productInterest: customer.productInterest,
            leadScore: customer.leadScore,
            notes: customer.notes,
            firstContactAt: customer.firstContactAt,
            lastContactAt: customer.lastContactAt,
            profileJson: customer.profileJson,
          },
        }),
      ),
    );
  }
  await prisma.conversation.createMany({ data: conversations, skipDuplicates: true });
  await prisma.message.createMany({ data: messages, skipDuplicates: true });
  await prisma.conversationSummary.createMany({ data: summaries, skipDuplicates: true });
  await prisma.workflowGraph.createMany({ data: graphs, skipDuplicates: true });
  await prisma.workflowNode.createMany({ data: nodes, skipDuplicates: true });
  await prisma.workflowEdge.createMany({ data: edges, skipDuplicates: true });
  await prisma.workflowNodeEvidence.createMany({ data: evidences, skipDuplicates: true });

  const metricDate = new Date('2026-07-11');
  await prisma.employeeDailyMetric.createMany({
    data: saleIds.slice(1).map((employeeId, index) => ({
      id: stableId('employee-metric', index),
      organizationId: id.org,
      employeeId,
      metricDate,
      assignedCustomers: 6,
      activeConversations: 1 + (index % 2),
      closedConversations: 4 + (index % 3),
      wonCount: 2 + (index % 3),
      lostCount: index % 2,
      stoppedCount: 1,
      conversionRate: 0.45 + index * 0.045,
      averageFirstResponseSeconds: 90 + index * 27,
      averageCloseSeconds: 72000 + index * 10800,
      medianCloseSeconds: 68400 + index * 9000,
    })),
    skipDuplicates: true,
  });

  const experiences: any[] = [];
  saleIds.forEach((employeeId, employeeIndex) => {
    const employeeName = saleNames[employeeIndex]!;
    const ownedConversations = conversationIds.filter(
      (_, index) => index % saleIds.length === employeeIndex,
    );
    experiences.push({
      id: stableId('experience-overall', employeeIndex),
      organizationId: id.org,
      employeeId,
      type: 'OVERALL',
      title: `Kinh nghiệm tổng thể của ${employeeName}`,
      summary: `${employeeName} đạt hiệu quả tốt khi làm rõ vấn đề trước khi giới thiệu tính năng, sau đó chốt một bước tiếp theo có thời gian cụ thể.`,
      playbookJson: {
        strengths: [
          'Đặt câu hỏi định lượng',
          'Gắn giải pháp với pain point',
          'Chốt lịch hoặc pilot rõ ràng',
        ],
        avoid: ['Gửi báo giá trước khi hiểu quy mô', 'Follow-up không có mục tiêu'],
        recommendedFlow: ['Khám phá', 'Xác nhận vấn đề', 'Giải đáp rào cản', 'Chốt bước tiếp theo'],
      },
      evidenceJson: {
        conversationIds: ownedConversations.slice(0, 5),
        workflowNodeIds: nodeIds
          .filter((_, index) => index % saleIds.length === employeeIndex)
          .slice(0, 8),
      },
      confidenceScore: 0.76 + employeeIndex * 0.02,
      sampleSize: ownedConversations.length,
      generatedAt: new Date('2026-07-11T17:00:00Z'),
    });
    segments.forEach((segment, segmentIndex) => {
      experiences.push({
        id: stableId(`experience-segment-${employeeIndex}`, segmentIndex),
        organizationId: id.org,
        employeeId,
        type: 'CUSTOMER_SEGMENT',
        customerSegment: segment,
        title: `Playbook cho nhóm ${segment}`,
        summary:
          segment === 'Enterprise'
            ? 'Ưu tiên bảo mật, tích hợp và lộ trình pilot có tiêu chí nghiệm thu.'
            : segment === 'SME'
              ? 'Tập trung hiệu quả nhanh, chi phí theo quy mô và onboarding ngắn.'
              : segment === 'Startup'
                ? 'Dẫn dắt bằng thử nghiệm nhỏ, tốc độ và khả năng mở rộng.'
                : 'Giải thích ngắn gọn, minh bạch chi phí và đưa ra lựa chọn đơn giản.',
        playbookJson: {
          openingQuestion: `Mục tiêu quan trọng nhất của nhóm ${segment} trong 90 ngày tới là gì?`,
          proofPoints:
            segment === 'Enterprise'
              ? ['Bảo mật session', 'Audit log', 'SLA']
              : ['Thời gian tạo giá trị', 'Pilot nhỏ', 'Chi phí linh hoạt'],
          nextBestAction:
            segment === 'Enterprise'
              ? 'Đề xuất workshop kỹ thuật'
              : 'Đề xuất demo theo dữ liệu mẫu',
        },
        evidenceJson: {
          conversationIds: conversationIds
            .filter(
              (_, index) =>
                index % saleIds.length === employeeIndex &&
                segments[index % segments.length] === segment,
            )
            .slice(0, 4),
        },
        confidenceScore: 0.68 + ((employeeIndex + segmentIndex) % 16) / 100,
        sampleSize: 3 + ((employeeIndex + segmentIndex) % 5),
        generatedAt: new Date('2026-07-11T17:05:00Z'),
      });
    });
  });
  await prisma.employeeExperience.createMany({ data: experiences, skipDuplicates: true });
  for (const [experienceIndex, experience] of experiences.entries()) {
    const segment = experience.customerSegment as string | undefined;
    await prisma.employeeExperience.update({
      where: { id: experience.id },
      data: {
        title: experience.title,
        summary: experience.summary,
        playbookJson: {
          ...(experience.playbookJson as Record<string, unknown>),
          workflowBlueprint: workflowBlueprint(segment),
          segmentSignals: segment
            ? {
                buyingTrigger:
                  segment === 'Enterprise'
                    ? 'Có chương trình chuyển đổi số hoặc yêu cầu governance'
                    : 'Đội sales tăng nhanh và không còn theo dõi thủ công hiệu quả',
                decisionPattern:
                  segment === 'Enterprise'
                    ? 'Nhiều stakeholder, cần security review và procurement'
                    : 'Quyết định nhanh khi time-to-value và chi phí rõ ràng',
                mainRisk:
                  segment === 'Enterprise'
                    ? 'Chu kỳ dài do tích hợp và phê duyệt'
                    : 'Mất quan tâm nếu demo không tạo giá trị ngay',
              }
            : undefined,
          observedMetrics: {
            sampleSize: experience.sampleSize,
            conversionRate: Number((0.32 + (experienceIndex % 9) * 0.055).toFixed(3)),
            averageResponseMinutes: 4 + (experienceIndex % 18),
            medianDaysToClose: 3 + (experienceIndex % 16),
            strongestStage: experienceIndex % 2 === 0 ? 'Xử lý rào cản' : 'Xác nhận nhu cầu',
            improvementStage: experienceIndex % 3 === 0 ? 'Khám phá ngân sách' : 'Chốt stakeholder',
          },
        },
        evidenceJson: experience.evidenceJson,
        confidenceScore: experience.confidenceScore,
        sampleSize: experience.sampleSize,
        generatedAt: experience.generatedAt,
      },
    });
  }

  await prisma.insight.update({
    where: { id: '60000000-0000-4000-8000-000000000001' },
    data: {
      method: 'CLASSIFICATION',
      severity: 'INFO',
      referenceCount: 1,
      explanationText:
        'Hệ thống so sánh các deal đã chốt với những deal còn lại, sau đó kiểm tra xem việc giải đáp rào cản bảo mật và xác nhận bước tiếp theo có xuất hiện thường xuyên hơn ở nhóm thành công hay không. Kết quả cho thấy đây là tín hiệu tích cực, nhưng cỡ mẫu ban đầu còn nhỏ nên cần tiếp tục theo dõi.',
      analysisJson: {
        question: 'Conversation có khả năng WON khi rào cản bảo mật được giải đáp không?',
        algorithm: 'Rule-based classification baseline',
        features: ['security_concern_resolved', 'next_step_confirmed', 'sale_response_time'],
        result: { predictedLabel: 'HIGH_PROPENSITY', score: 0.83 },
      },
    },
  });
  await prisma.insightReference.upsert({
    where: {
      insightId_referenceType_referenceId: {
        insightId: '60000000-0000-4000-8000-000000000001',
        referenceType: 'CONVERSATION',
        referenceId: id.wonConversation,
      },
    },
    update: {},
    create: {
      organizationId: id.org,
      insightId: '60000000-0000-4000-8000-000000000001',
      referenceType: 'CONVERSATION',
      referenceId: id.wonConversation,
      label: 'Deal pilot đã WON',
      excerpt: 'Khách xác nhận pilot sau khi được giải đáp về bảo mật Telegram session.',
      relevanceScore: 0.96,
    },
  });

  const methodConfigs = [
    {
      method: 'ANOMALY_DETECTION',
      type: 'ANOMALY',
      title: 'Phát hiện bất thường',
      metric: 'response_time_zscore',
      algorithm: 'Robust Z-score với median absolute deviation',
    },
    {
      method: 'CLUSTERING',
      type: 'CUSTOMER_CLUSTER',
      title: 'Cụm hành vi khách hàng',
      metric: 'cluster_density',
      algorithm: 'K-medoids trên đặc trưng hành vi đã chuẩn hóa',
    },
    {
      method: 'CLASSIFICATION',
      type: 'PROPENSITY',
      title: 'Phân loại khả năng chốt',
      metric: 'propensity_score',
      algorithm: 'Rule classifier có calibration từ outcome lịch sử',
    },
    {
      method: 'ASSOCIATION_RULE',
      type: 'ASSOCIATION',
      title: 'Luật kết hợp sản phẩm và nhu cầu',
      metric: 'lift',
      algorithm: 'Apriori support-confidence-lift',
    },
  ] as const;
  const generatedInsights: any[] = [];
  const generatedReferences: any[] = [];
  for (let index = 1; index <= 95; index += 1) {
    const config = methodConfigs[index % methodConfigs.length]!;
    const insightId = stableId('data-mining-insight', index);
    const conversationId = conversationIds[index % conversationIds.length]!;
    const customerId = customerIds[index % customerIds.length]!;
    const workflowNodeId = nodeIds[(index * 3) % nodeIds.length]!;
    const segment = segments[index % segments.length]!;
    const product = products[(index * 3) % products.length]!;
    const metricValue =
      config.method === 'ASSOCIATION_RULE'
        ? 1.18 + (index % 9) * 0.11
        : config.method === 'ANOMALY_DETECTION'
          ? 2.1 + (index % 7) * 0.34
          : 0.52 + (index % 13) * 0.031;
    const title =
      config.method === 'ANOMALY_DETECTION'
        ? `${config.title}: ${3 + (index % 8)} conversation phản hồi chậm bất thường`
        : config.method === 'CLUSTERING'
          ? `${config.title}: nhóm ${segment} ưu tiên ${product}`
          : config.method === 'CLASSIFICATION'
            ? `${config.title}: ${segment} có tín hiệu ${index % 3 === 0 ? 'rủi ro' : 'tích cực'}`
            : `${config.title}: quan tâm ${product} thường đi cùng nhu cầu follow-up`;
    generatedInsights.push({
      id: insightId,
      organizationId: id.org,
      method: config.method,
      type: config.type,
      title,
      description:
        config.method === 'ASSOCIATION_RULE'
          ? `Khách hỏi về ${product} có xu hướng đồng thời quan tâm khả năng quản lý follow-up; lift ${metricValue.toFixed(2)}.`
          : config.method === 'ANOMALY_DETECTION'
            ? `Một nhóm conversation lệch đáng kể khỏi baseline phản hồi của đội sales và cần được kiểm tra.`
            : config.method === 'CLUSTERING'
              ? `Nhóm ${segment} có hành vi tương đồng về câu hỏi, rào cản và bước tiếp theo trong workflow.`
              : `Mô hình rule-based xếp nhóm khách theo tín hiệu workflow, lead score và lịch sử phản hồi.`,
      explanationText:
        config.method === 'ANOMALY_DETECTION'
          ? `Hệ thống lấy thời gian phản hồi thông thường của đội sales làm mốc, rồi tìm các transaction lệch xa mốc đó. Có ${3 + (index % 8)} trường hợp phản hồi chậm đáng kể; quản lý nên kiểm tra để biết sale quá tải, khách bị bỏ quên hay dữ liệu đồng bộ có vấn đề.`
          : config.method === 'CLUSTERING'
            ? `Hệ thống không gán nhãn trước mà nhóm các khách có câu hỏi, rào cản, sản phẩm quan tâm và workflow tương tự. Một nhóm ${segment} nổi bật vì cùng ưu tiên ${product}; nhóm này có thể dùng chung kịch bản khám phá và demo.`
            : config.method === 'CLASSIFICATION'
              ? `Từ outcome lịch sử, hệ thống kiểm tra lead score, yêu cầu demo, objection đã xử lý và bước tiếp theo đã xác nhận. Khách ${segment} trong nhóm này được xếp vào mức ${index % 3 === 0 ? 'cần theo dõi rủi ro' : 'có khả năng chốt tích cực'} để sale ưu tiên hành động phù hợp.`
              : `Hệ thống đếm số lần nhu cầu ${product} và yêu cầu follow-up xuất hiện cùng nhau, rồi so với tần suất chung. Lift ${metricValue.toFixed(2)} cho thấy hai tín hiệu đi cùng nhau nhiều hơn mức thông thường, vì vậy sale nên chủ động đề xuất follow-up khi khách nhắc đến sản phẩm này.`,
      metricName: config.metric,
      metricValue,
      baselineValue:
        config.method === 'ANOMALY_DETECTION' ? 1 : config.method === 'ASSOCIATION_RULE' ? 1 : 0.5,
      sampleSize: 12 + (index % 31),
      confidenceScore: 0.64 + (index % 27) / 100,
      severity:
        config.method === 'ANOMALY_DETECTION' && index % 3 === 0
          ? 'HIGH'
          : index % 4 === 0
            ? 'MEDIUM'
            : 'INFO',
      referenceCount: 3,
      timeWindowStart: new Date('2026-06-01T00:00:00Z'),
      timeWindowEnd: new Date('2026-07-11T00:00:00Z'),
      evidenceJson: {
        conversationIds: [conversationId],
        customerIds: [customerId],
        workflowNodeIds: [workflowNodeId],
      },
      analysisJson: {
        question: title,
        dataset: { conversations: 50, messages: 402, windowDays: 41 },
        features: [
          'response_seconds',
          'lead_score',
          'customer_segment',
          'workflow_titles',
          'concerns',
          'mentioned_products',
        ],
        algorithm: config.algorithm,
        steps: [
          'Lọc dữ liệu theo organization',
          'Chuẩn hóa đặc trưng',
          'Tính metric bằng code',
          'Kiểm tra sample size và confidence',
          'AI chỉ diễn đạt kết quả',
        ],
        result: { metric: config.metric, value: metricValue, segment, product },
        visualization: Array.from({ length: 8 }, (_, point) => ({
          x: point + 1,
          y: Number((metricValue * (0.72 + ((point + index) % 5) * 0.08)).toFixed(3)),
        })),
      },
      status: 'PUBLISHED',
      publishedAt: new Date(`2026-07-${String(1 + (index % 11)).padStart(2, '0')}T00:05:00Z`),
    });
    [
      [
        'CONVERSATION',
        conversationId,
        `Conversation ${conversationId.slice(0, 8)}`,
        'Timeline và outcome được dùng trong phép tính.',
      ],
      [
        'CUSTOMER',
        customerId,
        `${segment} · ${product}`,
        'Customer segment, lead score và product interest.',
      ],
      [
        'WORKFLOW_NODE',
        workflowNodeId,
        'Workflow evidence',
        'Node động và message evidence hỗ trợ kết luận.',
      ],
    ].forEach(([referenceType, referenceId, label, excerpt], referenceIndex) => {
      generatedReferences.push({
        id: stableId(`insight-reference-${index}`, referenceIndex),
        organizationId: id.org,
        insightId,
        referenceType,
        referenceId,
        label,
        excerpt,
        relevanceScore: 0.78 + ((index + referenceIndex) % 18) / 100,
        metadataJson: { method: config.method },
      });
    });
  }
  await prisma.insight.deleteMany({
    where: { organizationId: id.org, id: { in: generatedInsights.map((insight) => insight.id) } },
  });
  await prisma.insight.createMany({ data: generatedInsights });
  await prisma.insightReference.createMany({ data: generatedReferences });
}

async function main() {
  const passwordHash = await bcrypt.hash('Demo123!', 12);
  await prisma.organization.upsert({
    where: { id: id.org },
    update: {},
    create: { id: id.org, name: 'Demo Sales Organization', timezone: 'Asia/Ho_Chi_Minh' },
  });
  await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: { passwordHash },
    create: { id: id.adminUser, email: 'admin@demo.local', passwordHash, fullName: 'Demo Admin' },
  });
  await prisma.user.upsert({
    where: { email: 'sale@demo.local' },
    update: { passwordHash },
    create: {
      id: id.saleUser,
      email: 'sale@demo.local',
      passwordHash,
      fullName: 'Nguyễn Minh Sale',
    },
  });
  await prisma.employee.upsert({
    where: { id: id.admin },
    update: {},
    create: {
      id: id.admin,
      organizationId: id.org,
      userId: id.adminUser,
      employeeCode: 'ADM-001',
      fullName: 'Demo Admin',
      email: 'admin@demo.local',
      role: 'ADMIN',
    },
  });
  await prisma.employee.upsert({
    where: { id: id.sale },
    update: {},
    create: {
      id: id.sale,
      organizationId: id.org,
      userId: id.saleUser,
      employeeCode: 'SALE-001',
      fullName: 'Nguyễn Minh Sale',
      email: 'sale@demo.local',
      phone: '+8490***567',
      role: 'SALE',
    },
  });
  await prisma.telegramUserSession.upsert({
    where: { id: id.session },
    update: {},
    create: {
      id: id.session,
      organizationId: id.org,
      employeeId: id.sale,
      telegramUserId: '100001',
      phoneMasked: '+8490***567',
      username: 'demo_sale',
      status: 'CONNECTED',
      lastSyncedAt: new Date('2026-07-11T10:00:00Z'),
    },
  });
  await prisma.telegramBotAccount.upsert({
    where: { organizationId_botRole: { organizationId: id.org, botRole: 'SUGGESTION' } },
    update: {},
    create: {
      organizationId: id.org,
      botRole: 'SUGGESTION',
      botUsername: 'tsi_suggestion_demo_bot',
      openclawAccountId: 'OPENCLAW_SUGGESTION_PLACEHOLDER',
      status: 'ACTIVE',
    },
  });
  await prisma.telegramBotAccount.upsert({
    where: { organizationId_botRole: { organizationId: id.org, botRole: 'ANALYST' } },
    update: {},
    create: {
      organizationId: id.org,
      botRole: 'ANALYST',
      botUsername: 'tsi_analyst_demo_bot',
      openclawAccountId: 'OPENCLAW_ANALYST_PLACEHOLDER',
      status: 'ACTIVE',
    },
  });

  await prisma.customer.upsert({
    where: { id: id.customerA },
    update: {},
    create: {
      id: id.customerA,
      organizationId: id.org,
      ownerEmployeeId: id.sale,
      fullName: 'Nguyễn Văn An',
      telegramUserId: '200001',
      telegramUsername: 'an_demo',
      customerType: 'SME',
      productInterest: 'Sales CRM',
      leadScore: 82,
      notes: 'Quan tâm thời gian triển khai và chi phí.',
      firstContactAt: new Date('2026-07-10T02:00:00Z'),
      lastContactAt: new Date('2026-07-11T09:25:00Z'),
    },
  });
  await prisma.customer.upsert({
    where: { id: id.customerB },
    update: {},
    create: {
      id: id.customerB,
      organizationId: id.org,
      ownerEmployeeId: id.sale,
      fullName: 'Trần Minh Hà',
      telegramUserId: '200002',
      telegramUsername: 'ha_demo',
      customerType: 'Enterprise',
      productInterest: 'Conversation Intelligence',
      leadScore: 95,
      notes: 'Deal đã chốt gói pilot.',
      firstContactAt: new Date('2026-07-01T03:00:00Z'),
      lastContactAt: new Date('2026-07-08T08:00:00Z'),
    },
  });
  await prisma.conversation.upsert({
    where: { id: id.openConversation },
    update: {},
    create: {
      id: id.openConversation,
      organizationId: id.org,
      customerId: id.customerA,
      employeeId: id.sale,
      status: 'OPEN',
      outcome: 'NONE',
      startedAt: new Date('2026-07-10T02:00:00Z'),
      lastCustomerMessageAt: new Date('2026-07-11T09:25:00Z'),
      lastSaleMessageAt: new Date('2026-07-11T09:10:00Z'),
      lastMessageAt: new Date('2026-07-11T09:25:00Z'),
    },
  });
  await prisma.conversation.upsert({
    where: { id: id.wonConversation },
    update: {},
    create: {
      id: id.wonConversation,
      organizationId: id.org,
      customerId: id.customerB,
      employeeId: id.sale,
      status: 'CLOSED',
      outcome: 'WON',
      startedAt: new Date('2026-07-01T03:00:00Z'),
      lastCustomerMessageAt: new Date('2026-07-08T08:00:00Z'),
      lastSaleMessageAt: new Date('2026-07-08T07:58:00Z'),
      lastMessageAt: new Date('2026-07-08T08:00:00Z'),
      closedAt: new Date('2026-07-08T08:05:00Z'),
      closedByEmployeeId: id.sale,
      closeReason: 'Khách xác nhận pilot 3 tháng.',
    },
  });

  const texts = [
    [
      id.openConversation,
      'o1',
      'CUSTOMER',
      'Chào em, anh đang tìm giải pháp quản lý đội sales 12 người.',
      '2026-07-10T02:00:00Z',
    ],
    [
      id.openConversation,
      'o2',
      'EMPLOYEE',
      'Em chào anh An. Đội mình đang gặp khó khăn lớn nhất ở khâu nào ạ?',
      '2026-07-10T02:03:00Z',
    ],
    [
      id.openConversation,
      'o3',
      'CUSTOMER',
      'Khó theo dõi chất lượng tư vấn và khách bị bỏ quên.',
      '2026-07-10T02:06:00Z',
    ],
    [
      id.openConversation,
      'o4',
      'EMPLOYEE',
      'Bên em có thể đồng bộ hội thoại và cảnh báo khách cần follow-up.',
      '2026-07-10T02:10:00Z',
    ],
    [
      id.openConversation,
      'o5',
      'CUSTOMER',
      'Có cần thay đổi cách sales dùng Telegram không?',
      '2026-07-10T02:16:00Z',
    ],
    [
      id.openConversation,
      'o6',
      'EMPLOYEE',
      'Không ạ, sales vẫn chat bằng tài khoản cá nhân và hệ thống chỉ phân tích.',
      '2026-07-10T02:20:00Z',
    ],
    [
      id.openConversation,
      'o7',
      'CUSTOMER',
      'Vậy gửi anh thời gian triển khai và báo giá cho 12 người nhé.',
      '2026-07-11T09:25:00Z',
    ],
    [
      id.wonConversation,
      'w1',
      'CUSTOMER',
      'Chị cần xem giải pháp phân tích hội thoại cho nhóm telesales.',
      '2026-07-01T03:00:00Z',
    ],
    [
      id.wonConversation,
      'w2',
      'EMPLOYEE',
      'Nhóm của chị hiện có bao nhiêu tư vấn viên ạ?',
      '2026-07-01T03:02:00Z',
    ],
    [
      id.wonConversation,
      'w3',
      'CUSTOMER',
      'Khoảng 30 bạn, chủ yếu dùng Telegram.',
      '2026-07-01T03:05:00Z',
    ],
    [
      id.wonConversation,
      'w4',
      'EMPLOYEE',
      'Em đề xuất pilot với 5 bạn trong 3 tuần để đo hiệu quả.',
      '2026-07-01T03:12:00Z',
    ],
    [
      id.wonConversation,
      'w5',
      'CUSTOMER',
      'Dữ liệu Telegram session được bảo vệ thế nào?',
      '2026-07-02T04:00:00Z',
    ],
    [
      id.wonConversation,
      'w6',
      'EMPLOYEE',
      'Session được mã hóa AES-256-GCM, AI và bot không được truy cập.',
      '2026-07-02T04:05:00Z',
    ],
    [
      id.wonConversation,
      'w7',
      'CUSTOMER',
      'Ổn. Chị cần report hằng ngày cho manager.',
      '2026-07-03T06:00:00Z',
    ],
    [
      id.wonConversation,
      'w8',
      'EMPLOYEE',
      'Report gồm conversion, follow-up, insight và lưu ở object storage.',
      '2026-07-03T06:04:00Z',
    ],
    [id.wonConversation, 'w9', 'CUSTOMER', 'Gửi chị proposal pilot nhé.', '2026-07-05T07:00:00Z'],
    [
      id.wonConversation,
      'w10',
      'EMPLOYEE',
      'Em đã gửi proposal, chị xem giúp em phạm vi và timeline.',
      '2026-07-05T07:08:00Z',
    ],
    [
      id.wonConversation,
      'w11',
      'CUSTOMER',
      'Chị xác nhận pilot 3 tháng. Tiến hành hợp đồng nhé.',
      '2026-07-08T08:00:00Z',
    ],
  ] as const;
  for (const [
    index,
    [conversationId, telegramMessageId, senderType, textContent, sentAt],
  ] of texts.entries()) {
    const customerId = conversationId === id.openConversation ? id.customerA : id.customerB;
    await prisma.message.upsert({
      where: {
        telegramUserSessionId_telegramMessageId: {
          telegramUserSessionId: id.session,
          telegramMessageId,
        },
      },
      update: {},
      create: {
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        organizationId: id.org,
        conversationId,
        telegramUserSessionId: id.session,
        telegramMessageId,
        senderType,
        senderEmployeeId: senderType === 'EMPLOYEE' ? id.sale : null,
        senderCustomerId: senderType === 'CUSTOMER' ? customerId : null,
        messageType: 'TEXT',
        textContent,
        sentAt: new Date(sentAt),
        rawPayloadJson: { seeded: true },
      },
    });
  }

  const openSummary = await prisma.conversationSummary.upsert({
    where: { conversationId_version: { conversationId: id.openConversation, version: 1 } },
    update: {},
    create: {
      organizationId: id.org,
      conversationId: id.openConversation,
      version: 1,
      summaryText:
        'Khách có đội sales 12 người, cần theo dõi chất lượng tư vấn và chống bỏ quên khách. Đang chờ timeline và báo giá.',
      customerNeedsJson: ['conversation quality', 'follow-up'],
      customerConcernsJson: ['adoption', 'implementation time', 'price'],
      productsJson: ['Sales CRM'],
      nextActionsJson: ['Gửi timeline', 'Gửi báo giá'],
      modelName: 'fake-ai-v1',
      promptVersion: 'summary-v1',
    },
  });
  const wonSummary = await prisma.conversationSummary.upsert({
    where: { conversationId_version: { conversationId: id.wonConversation, version: 1 } },
    update: {},
    create: {
      organizationId: id.org,
      conversationId: id.wonConversation,
      version: 1,
      summaryText:
        'Khách enterprise xác nhận pilot 3 tháng sau khi được giải đáp về bảo mật session và daily report.',
      customerNeedsJson: ['conversation analytics', 'manager report'],
      customerConcernsJson: ['Telegram session security'],
      productsJson: ['Conversation Intelligence'],
      commitmentsJson: ['Pilot 3 tháng'],
      modelName: 'fake-ai-v1',
      promptVersion: 'summary-v1',
    },
  });
  await prisma.conversation.update({
    where: { id: id.openConversation },
    data: { currentSummaryId: openSummary.id },
  });
  await prisma.conversation.update({
    where: { id: id.wonConversation },
    data: { currentSummaryId: wonSummary.id },
  });

  await prisma.workflowGraph.upsert({
    where: { conversationId: id.openConversation },
    update: {},
    create: {
      id: id.openGraph,
      organizationId: id.org,
      conversationId: id.openConversation,
      currentRevision: 3,
      status: 'ACTIVE',
    },
  });
  await prisma.workflowGraph.upsert({
    where: { conversationId: id.wonConversation },
    update: {},
    create: {
      id: id.wonGraph,
      organizationId: id.org,
      conversationId: id.wonConversation,
      currentRevision: 4,
      status: 'COMPLETED',
    },
  });
  const nodeData = [
    [
      '30000000-0000-4000-8000-000000000001',
      id.openGraph,
      'Khách mô tả bài toán quản lý đội sales',
      'Khách có đội 12 người và cần quan sát chất lượng tư vấn.',
      0.94,
      '20000000-0000-4000-8000-000000000001',
    ],
    [
      '30000000-0000-4000-8000-000000000002',
      id.openGraph,
      'Làm rõ nguy cơ bỏ quên khách',
      'Khách nêu tình trạng không theo dõi được và bỏ sót follow-up.',
      0.91,
      '20000000-0000-4000-8000-000000000003',
    ],
    [
      '30000000-0000-4000-8000-000000000003',
      id.openGraph,
      'Khách kiểm tra tác động lên cách làm hiện tại',
      'Khách muốn giữ nguyên trải nghiệm Telegram của sale.',
      0.88,
      '20000000-0000-4000-8000-000000000005',
    ],
    [
      '30000000-0000-4000-8000-000000000004',
      id.openGraph,
      'Yêu cầu timeline và báo giá',
      'Khách đã chuyển sang đánh giá triển khai và chi phí.',
      0.96,
      '20000000-0000-4000-8000-000000000007',
    ],
    [
      '30000000-0000-4000-8000-000000000005',
      id.wonGraph,
      'Xác nhận pilot sau đánh giá bảo mật',
      'Khách đồng ý pilot 3 tháng sau khi nhận đủ thông tin.',
      0.98,
      '20000000-0000-4000-8000-000000000018',
    ],
  ] as const;
  for (const [nodeId, graphId, title, description, confidence, messageId] of nodeData) {
    await prisma.workflowNode.upsert({
      where: { id: nodeId },
      update: {},
      create: {
        id: nodeId,
        organizationId: id.org,
        workflowGraphId: graphId,
        title,
        description,
        shortSummary: title,
        confidence,
        metadataJson: {
          customerIntent: title.includes('báo giá') ? 'evaluate_price' : 'explore_solution',
          seeded: true,
        },
        isAiGenerated: true,
        isLocked: nodeId.endsWith('0003'),
      },
    });
    await prisma.workflowNodeEvidence.upsert({
      where: { workflowNodeId_messageId: { workflowNodeId: nodeId, messageId } },
      update: {},
      create: {
        organizationId: id.org,
        workflowNodeId: nodeId,
        messageId,
        evidenceRole: 'PRIMARY',
        excerpt: texts[Number(messageId.slice(-12)) - 1]?.[3] ?? 'Seed evidence',
        relevanceScore: confidence,
      },
    });
  }
  const edges = [
    [
      '40000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      'Từ bối cảnh đến pain point',
    ],
    [
      '40000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003',
      'Sau khi nghe giải pháp',
    ],
    [
      '40000000-0000-4000-8000-000000000003',
      '30000000-0000-4000-8000-000000000003',
      '30000000-0000-4000-8000-000000000004',
      'Chuyển sang đánh giá thương mại',
    ],
  ] as const;
  for (const [edgeId, fromNodeId, toNodeId, label] of edges)
    await prisma.workflowEdge.upsert({
      where: { id: edgeId },
      update: {},
      create: {
        id: edgeId,
        organizationId: id.org,
        workflowGraphId: id.openGraph,
        fromNodeId,
        toNodeId,
        label,
        confidence: 0.9,
      },
    });

  await prisma.replySuggestion.upsert({
    where: { id: '50000000-0000-4000-8000-000000000001' },
    update: {
      metadataJson: {
        appointment: {
          detected: true,
          title: 'Demo giải pháp Sales Intelligence',
          startAt: '2026-07-14T03:00:00.000Z',
          durationMinutes: 45,
          askEmployeeConfirmation: true,
        },
      },
    },
    create: {
      id: '50000000-0000-4000-8000-000000000001',
      organizationId: id.org,
      conversationId: id.openConversation,
      employeeId: id.sale,
      basedOnFromMessageId: '20000000-0000-4000-8000-000000000007',
      basedOnToMessageId: '20000000-0000-4000-8000-000000000007',
      workflowRevision: 3,
      suggestionText:
        'Dạ, với đội 12 người bên em đề xuất triển khai pilot trong 2 tuần. Em gửi anh hai phương án chi phí để mình dễ so sánh nhé.',
      shortRationale: 'Trả lời trực tiếp timeline và mở lựa chọn báo giá.',
      confidence: 0.9,
      status: 'GENERATED',
      modelName: 'fake-ai-v1',
      promptVersion: 'suggestion-v1',
      metadataJson: {
        appointment: {
          detected: true,
          title: 'Demo giải pháp Sales Intelligence',
          startAt: '2026-07-14T03:00:00.000Z',
          durationMinutes: 45,
          askEmployeeConfirmation: true,
        },
      },
      generatedAt: new Date('2026-07-11T09:28:00Z'),
      expiresAt: new Date('2026-07-12T09:28:00Z'),
    },
  });
  await prisma.insight.upsert({
    where: { id: '60000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '60000000-0000-4000-8000-000000000001',
      organizationId: id.org,
      type: 'CONVERSION_RATE',
      title: 'Conversation được giải đáp bảo mật có tín hiệu tốt',
      description:
        'Trong dữ liệu demo, deal WON được xác nhận sau khi sale trả lời rõ về bảo vệ Telegram session.',
      metricName: 'won_rate',
      metricValue: 1,
      baselineValue: 0,
      sampleSize: 1,
      confidenceScore: 0.4,
      timeWindowStart: new Date('2026-07-01'),
      timeWindowEnd: new Date('2026-07-11'),
      evidenceJson: { conversationIds: [id.wonConversation] },
      status: 'PUBLISHED',
      publishedAt: new Date('2026-07-11'),
    },
  });
  await prisma.employeeDailyMetric.upsert({
    where: {
      organizationId_employeeId_metricDate: {
        organizationId: id.org,
        employeeId: id.sale,
        metricDate: new Date('2026-07-11'),
      },
    },
    update: {},
    create: {
      organizationId: id.org,
      employeeId: id.sale,
      metricDate: new Date('2026-07-11'),
      assignedCustomers: 2,
      activeConversations: 1,
      closedConversations: 1,
      wonCount: 1,
      lostCount: 0,
      stoppedCount: 0,
      conversionRate: 1,
      averageFirstResponseSeconds: 150,
      averageCloseSeconds: 622800,
      medianCloseSeconds: 622800,
    },
  });
  await prisma.report.upsert({
    where: { id: id.report },
    update: {},
    create: {
      id: id.report,
      organizationId: id.org,
      reportType: 'TEAM_DAILY',
      reportDate: new Date('2026-07-11'),
      title: 'Daily sales report 2026-07-11',
      format: 'HTML',
      bucketName: 'reports',
      objectKey: `organizations/${id.org}/reports/2026/07/11/${id.report}.html`,
      contentType: 'text/html; charset=utf-8',
      sizeBytes: 1100,
      checksum: 'seed-report',
      status: 'UPLOADED',
      generatedAt: new Date('2026-07-11T17:00:00Z'),
      uploadedAt: new Date('2026-07-11T17:00:01Z'),
    },
  });

  await seedRealisticSalesRoom(passwordHash);
  await prisma.customer.update({
    where: { id: id.customerA },
    data: {
      profileJson: primaryCustomerProfile({
        fullName: 'Nguyễn Văn An',
        companyName: 'An Phát Digital',
        segment: 'SME',
        product: 'Conversation Intelligence',
        leadScore: 84,
      }),
    },
  });
  await prisma.customer.update({
    where: { id: id.customerB },
    data: {
      profileJson: primaryCustomerProfile({
        fullName: 'Trần Minh Hà',
        companyName: 'Horizon Enterprise Group',
        segment: 'Enterprise',
        product: 'AI Sales Assistant',
        leadScore: 91,
      }),
    },
  });
  await enrichMissingCustomerDetailProfiles();
}

main()
  .then(() => console.log('Seed completed.'))
  .finally(() => prisma.$disconnect());
