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
      stage: 'Discover context',
      observedBehavior: segment
        ? `The ${segment} customer shares goals, scale, and the current system.`
        : 'The customer shares scale, current systems, and business goals.',
      employeeAction: enterprise
        ? 'Identify the sponsor, decision maker, IT, and procurement early.'
        : 'Ask quantitative questions about sales team size, lead volume, and missed follow-ups.',
      customerSignal: 'The customer answers with metrics or describes a costly problem.',
      recommendedResponse: "Restate the problem in the customer's words and confirm priority.",
      exitCriteria: 'Pain point, impact, owner, and urgency are clear.',
      commonFailure: 'Pitching features before understanding the context.',
    },
    {
      stage: 'Validate needs',
      observedBehavior:
        'The customer asks how the system handles workflows, data, or specific use cases.',
      employeeAction: enterprise
        ? 'Use a solution map, integration architecture, and security controls.'
        : 'Link each need to a use case instead of listing every feature.',
      customerSignal: 'The customer requests a demo or gives success criteria.',
      recommendedResponse: 'Lock in 2-3 acceptance criteria for the demo or pilot.',
      exitCriteria: 'Both sides agree on the solution scope to evaluate.',
      commonFailure: 'A generic demo that does not use customer data or workflow.',
    },
    {
      stage: 'Handle objections',
      observedBehavior:
        'The customer raises budget, security, integration, adoption, or timeline concerns.',
      employeeAction:
        'Classify the objection, answer with evidence, and propose a risk-reduction option.',
      customerSignal:
        'The customer moves from objection to asking about implementation conditions.',
      recommendedResponse: enterprise
        ? 'Propose a technical workshop, security checklist, and acceptance-based pilot.'
        : 'Propose a small pilot that creates value within two weeks at a limited cost.',
      exitCriteria: 'The barrier has an owner and a next handling action.',
      commonFailure: 'Discounting before identifying the root objection.',
    },
    {
      stage: 'Move toward decision',
      observedBehavior:
        'The customer discusses stakeholders, proposal, demo schedule, or approval process.',
      employeeAction: 'Confirm attendees, timing, deliverables, and decision criteria.',
      customerSignal: 'The customer confirms a schedule or commits to providing data.',
      recommendedResponse: 'Create a mutual action plan and confirm deadlines for both sides.',
      exitCriteria: 'Schedule, owner, deliverable, and decision date are specific.',
      commonFailure: 'Ending with a follow-up line without a deadline.',
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
      location: 'Ho Chi Minh City',
      preferredChannel: 'Telegram',
    },
    businessContext: {
      companyName: input.companyName,
      industry: 'Technology and services',
      segment: input.segment,
      employeeCount: input.segment === 'Enterprise' ? 650 : 85,
      salesTeamSize: input.segment === 'Enterprise' ? 72 : 18,
      currentSystem: 'Internal CRM combined with Telegram and spreadsheets',
    },
    needs: {
      primaryGoal: 'See the full consultation-to-close process',
      painPoints: ['Customers are forgotten', 'Consultation quality cannot be evaluated'],
      successCriteria: ['Reduce response time by 30%', 'Increase close rate by 15%'],
      urgency: 'Launch a pilot this month',
    },
    interestedSolutions: {
      primaryProduct: input.product,
      relatedProducts: ['AI Sales Assistant', 'Sales Analytics'],
      priorityFeatures: ['Evidence-backed workflow', 'Automated insights', 'Daily report'],
    },
    budgetAndPurchase: {
      estimatedBudget:
        input.segment === 'Enterprise' ? '300-500 million VND/year' : '100-180 million VND/year',
      budgetStatus: 'Pending approval',
      purchaseAuthority: 'Recommender with high influence',
      purchaseProbability: input.leadScore / 100,
    },
    concernsAndBarriers: {
      primaryConcern: 'Security and legacy data integration',
      objections: ['Implementation timeline', 'Sales team adoption'],
      blockers: ['Security review and budget confirmation required'],
      riskLevel: 'Medium',
    },
    communicationBehavior: {
      style: 'Data-driven, prefers short evidence-backed answers',
      preferredContactTime: '14:00-17:00',
      averageResponseMinutes: 12,
      sentiment: 'Positive but cautious',
    },
    engagementAndClosing: {
      leadScore: input.leadScore,
      temperature: input.leadScore >= 80 ? 'Hot' : 'Warm',
      intentSignals: ['Requested a demo', 'Discussed budget and timeline'],
      nextBestAction: 'Technical workshop and pilot scope alignment',
    },
    decisionProcess: {
      currentStage: 'Solution evaluation',
      decisionMaker: `Executive team ${input.companyName}`,
      stakeholders: ['Sales Director', 'CTO', 'Finance Manager', 'Procurement'],
      expectedDecisionDate: '2026-07-28',
      requiredSteps: ['Demo', 'Security review', 'Budget approval', 'Sign pilot'],
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
  const industries = ['SaaS', 'Retail', 'Education', 'Logistics', 'Finance'];
  const roles = ['Sales Director', 'CEO', 'Head of Operations', 'CRM Manager', 'Business Owner'];
  const cities = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho'];
  const segment = input.customerType ?? segments[input.index % segments.length]!;
  const product = input.productInterest ?? products[input.index % products.length]!;
  const leadScore = input.leadScore ?? 62 + ((input.index * 7) % 34);
  const companyName = `${['Prosperity', 'BrightViet', 'Horizon', 'Nova', 'Oceanic'][input.index % 5]} ${
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
      ? '300-600 million VND/year'
      : segment === 'SME'
        ? '90-180 million VND/year'
        : '35-80 million VND/year';

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
          ? 'Telegram + spreadsheets + Internal CRM'
          : input.index % 3 === 1
            ? 'HubSpot without conversation sync yet'
            : 'Manual management on Telegram',
      operatingMarket: input.index % 2 === 0 ? 'Nationwide' : 'Domestic',
    },
    needs: {
      primaryGoal:
        'Standardize consultation data to see the journey from needs discovery to closing',
      painPoints: [
        'Hard to track which customers need follow-up',
        'No clear evidence for each consultation step',
        'Managers cannot see conversation quality in real time',
      ],
      successCriteria: [
        'Reduce response time below 10 minutes',
        'Increase close rate with consultation scripts by customer segment',
        'Provide end-of-day reports for sales managers',
      ],
      urgency:
        input.index % 2 === 0 ? 'Wants a pilot this month' : 'Needs a demo before budget approval',
    },
    interestedSolutions: {
      primaryProduct: product,
      relatedProducts: ['AI Sales Assistant', 'Customer Data Platform', 'Daily Sales Report'],
      priorityFeatures: [
        'Automatically ingest Telegram conversations',
        'Workflow nodes/edges include message references',
        'AI suggests replies for sales reps',
        'Insight data mining theo customer segment',
      ],
      alternativesConsidered:
        input.index % 2 === 0 ? ['HubSpot', 'Zoho CRM'] : ['Internal CRM', 'Google Sheet'],
    },
    budgetAndPurchase: {
      estimatedBudget: budget,
      budgetStatus: leadScore >= 80 ? 'Pilot budget is available' : 'Awaiting approval',
      purchaseAuthority:
        segment === 'Enterprise'
          ? 'Recommender; needs CTO/CFO approval'
          : 'Directly influences the purchase decision',
      paymentPreference:
        segment === 'Enterprise'
          ? '2-3 month pilot, then annual contract'
          : 'Monthly plan, expand after pilot',
      purchaseProbability: Math.min(0.96, Math.max(0.35, leadScore / 100)),
    },
    concernsAndBarriers: {
      primaryConcern:
        input.index % 3 === 0
          ? 'Telegram session security and data permissions'
          : input.index % 3 === 1
            ? 'Sales team adoption'
            : 'Implementation cost and legacy data integration',
      objections: [
        'Does not want sales reps to change current chat habits',
        'Needs to see which data AI used for conclusions',
        'Wants access control by employee',
      ],
      blockers:
        segment === 'Enterprise'
          ? ['Security review', 'Procurement review']
          : ['Needs a demo using real data', 'Pilot budget needs alignment'],
      riskLevel: leadScore >= 82 ? 'Low' : leadScore >= 65 ? 'Medium' : 'High',
    },
    communicationBehavior: {
      style:
        input.index % 3 === 0
          ? 'Concise, asks directly about cost and timeline'
          : input.index % 3 === 1
            ? 'Needs metrics, evidence, and practical examples'
            : 'Prefers step-by-step workflow guidance',
      preferredContactTime: input.index % 2 === 0 ? '09:00-11:00' : '14:00-17:00',
      averageResponseMinutes: 8 + (input.index % 28),
      sentiment:
        leadScore >= 80 ? 'Positive, intends to run a trial' : 'Interested but still cautious',
    },
    engagementAndClosing: {
      leadScore,
      temperature: leadScore >= 82 ? 'Hot' : leadScore >= 66 ? 'Warm' : 'Nurture',
      intentSignals: [
        'Asked about demo or pricing',
        'Raised a sales operations pain point',
        'Responded about implementation timeline',
      ],
      nextBestAction:
        leadScore >= 82
          ? 'Schedule a real-workflow demo and send a pilot proposal'
          : 'Send a short case study, then confirm the budget approver',
    },
    decisionProcess: {
      currentStage: leadScore >= 80 ? 'Solution evaluation' : 'Needs discovery',
      decisionMaker: segment === 'Enterprise' ? `Executive team ${companyName}` : input.fullName,
      stakeholders:
        segment === 'Enterprise'
          ? ['Sales Director', 'CTO', 'Finance Manager', 'Procurement']
          : ['Business Owner', 'Sales Lead'],
      expectedDecisionDate: `2026-07-${String(18 + (input.index % 10)).padStart(2, '0')}`,
      requiredSteps:
        segment === 'Enterprise'
          ? ['Business demo', 'Security review', 'Budget approval', 'Sign pilot']
          : ['Quick demo', 'Confirm pilot scope', 'Confirm cost'],
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
          'Demo seed profile: information synthesized from Telegram conversations, workflows, and sample insights.',
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
    'Michael Nguyen',
    'Liam Le',
    'Sophia Pham',
    'Ethan Do',
    'Maya Vu',
    'Daniel Tran',
    'Ava Bui',
    'Noah Hoang',
  ];
  const segments = ['Startup', 'SME', 'Enterprise', 'Individual'];
  const products = [
    'Sales CRM',
    'Conversation Intelligence',
    'Customer Data Platform',
    'AI Sales Assistant',
  ];
  saleNames.push(
    'Olivia Ngo',
    'Lucas Duong',
    'Mia Thomas',
    'Henry Phan',
    'Lily Vo',
    'Leo Mai',
    'Grace Trinh',
  );
  products.push('Sales Analytics', 'Omnichannel Support');
  const cleanFamilyNames = [
    'Smith',
    'Johnson',
    'Brown',
    'Davis',
    'Miller',
    'Wilson',
    'Phan',
    'Taylor',
    'Anderson',
    'Thomas',
    'Moore',
    'Martin',
  ];
  const cleanGivenNames = ['Liam', 'Olivia', 'Ethan', 'Emma', 'Noah', 'Ava', 'Lucas', 'Sophia'];
  const industries = [
    'Retail',
    'Finance',
    'Education',
    'Logistics',
    'SaaS',
    'Manufacturing',
    'Healthcare',
    'Real estate',
  ];
  const companyPrefixes = ['Prosperity', 'BrightViet', 'Nova', 'Success', 'Horizon', 'Oceanic'];
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
      'Budget',
      'Data security',
      'Implementation timeline',
      'Integration capability',
    ][index % 4]!;
    const decisionStage = [
      'Discovery',
      'Solution evaluation',
      'Vendor comparison',
      'Internal approval',
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
          ? 'Prioritizes fast rollout and needs legacy data integration.'
          : 'Tracked via Telegram.',
      firstContactAt: startedAt,
      lastContactAt: lastMessageAt,
      profileJson: {
        identity: {
          fullName: customerName,
          preferredName: cleanGivenNames[(index * 5) % cleanGivenNames.length],
          role,
          phone: `+848${index % 10}***${String(500 + index).padStart(3, '0')}`,
          telegram: `@customer_${String(index + 1).padStart(3, '0')}`,
          location: ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Can Tho'][index % 4],
        },
        businessContext: {
          companyName,
          industry,
          segment,
          employeeCount: teamSize * (segment === 'Enterprise' ? 8 : segment === 'SME' ? 3 : 1),
          salesTeamSize: teamSize,
          currentSystem: ['Excel and Telegram', 'HubSpot', 'Internal CRM', 'No centralized system'][
            index % 4
          ],
          operatingMarket: index % 3 === 0 ? 'Nationwide' : 'Domestic',
        },
        needs: {
          primaryGoal: 'Standardize the consultation process and reduce forgotten customers',
          painPoints: [
            'Hard to control consultation quality',
            'Cannot see deal status in real time',
            index % 2 === 0 ? 'Data is scattered' : "Follow-up depends on the sales rep's memory",
          ],
          successCriteria: [
            `Reduce response time by ${15 + (index % 6) * 5}%`,
            `Increase close rate by ${8 + (index % 5) * 3}%`,
          ],
          urgency: index % 5 === 0 ? 'This month' : 'Next quarter',
        },
        interestedSolutions: {
          primaryProduct: product,
          relatedProducts: [
            products[(index + 1) % products.length],
            products[(index + 3) % products.length],
          ],
          priorityFeatures: [
            'Evidence-backed workflow',
            'AI reply suggestions',
            'Management dashboard',
          ],
          alternativesConsidered: index % 3 === 0 ? ['HubSpot', 'Zoho CRM'] : ['Built in-house'],
        },
        budgetAndPurchase: {
          estimatedBudget: `${budgetMin}-${budgetMax} million VND/year`,
          budgetStatus: index % 4 === 0 ? 'Approved' : 'Budgeting in progress',
          purchaseAuthority:
            role === 'CEO' || role === 'Business Owner' ? 'Decision maker' : 'Recommender',
          paymentPreference: index % 2 === 0 ? 'Annual payment' : 'Pilot first, expand later',
          purchaseProbability: 0.42 + ((index * 7) % 52) / 100,
        },
        concernsAndBarriers: {
          primaryConcern,
          objections: [
            primaryConcern,
            index % 2 === 0 ? 'User adoption' : 'Implementation resources',
          ],
          blockers:
            index % 5 === 0 ? ['Waiting for CFO approval'] : ['Technical workshop required'],
          riskLevel: index % 7 === 0 ? 'High' : index % 3 === 0 ? 'Medium' : 'Low',
        },
        communicationBehavior: {
          style: [
            'Concise and direct',
            'Data-oriented',
            'Needs detailed explanation',
            'Prefers practical examples',
          ][index % 4],
          preferredChannel: 'Telegram',
          preferredContactTime: index % 2 === 0 ? '09:00-11:00' : '14:00-17:00',
          averageResponseMinutes: 8 + (index % 55),
          sentiment: index % 6 === 0 ? 'Cautious' : 'Positive',
        },
        engagementAndClosing: {
          leadScore: 38 + ((index * 13) % 61),
          temperature: index % 5 === 0 ? 'Hot' : index % 3 === 0 ? 'Warm' : 'Nurture',
          intentSignals: [
            'Demo request',
            index % 4 === 0 ? 'Asked about budget' : 'Asked about implementation timeline',
          ],
          nextBestAction:
            index % 4 === 0
              ? 'Send a budget-aligned business case'
              : 'Run a demo based on the real workflow',
        },
        decisionProcess: {
          currentStage: decisionStage,
          decisionMaker: role === 'CEO' ? customerName : `Executive team ${companyName}`,
          stakeholders: [role, 'IT Manager', 'Finance Manager'],
          expectedDecisionDate: `2026-07-${String(15 + (index % 14)).padStart(2, '0')}`,
          requiredSteps: ['Business demo', 'Technical review', 'Budget approval', 'Sign contract'],
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
          ? 'Customer confirmed implementation.'
          : outcome === 'LOST'
            ? 'Budget was not suitable.'
            : outcome === 'STOPPED'
              ? 'Customer paused the plan.'
              : null,
    });

    const appointmentText =
      index % 7 === 0
        ? `Let's schedule the demo at 14:30 on 2026-07-${String(18 + (index % 8)).padStart(2, '0')}.`
        : 'Can your team show me a demo based on our current workflow?';
    const script = [
      ['CUSTOMER', `Hi, we are a ${segment} and we are evaluating ${product}.`],
      [
        'EMPLOYEE',
        `I want to understand the scale and goals so I can advise on ${product} more precisely.`,
      ],
      [
        'CUSTOMER',
        `The team currently has ${5 + (index % 45)} people, and it is hard to control follow-up and consultation quality.`,
      ],
      [
        'EMPLOYEE',
        'The system stores conversations, builds evidence-backed workflows, and flags customers needing follow-up.',
      ],
      [
        'CUSTOMER',
        index % 4 === 0
          ? 'Will the cost exceed an 80 million VND budget?'
          : 'How long will implementation and data integration take?',
      ],
      [
        'EMPLOYEE',
        index % 4 === 0
          ? 'We have a scale-based pilot package to validate effectiveness first.'
          : 'A pilot is usually completed in 2 weeks, then expanded based on real data.',
      ],
      ['CUSTOMER', appointmentText],
      [
        'EMPLOYEE',
        outcome === 'WON'
          ? 'I will confirm the schedule and send the proposal and pilot scope today.'
          : 'I will send the materials and align on next steps after the demo.',
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
      summaryText: `${customerName} (${segment}) is interested in ${product}, prioritizes ${index % 4 === 0 ? 'budget' : 'implementation speed'} and discussed the demo/pilot step.`,
      customerNeedsJson: ['follow-up visibility', 'conversation quality', product],
      customerConcernsJson: [index % 4 === 0 ? 'budget' : 'implementation_time'],
      productsJson: [product],
      commitmentsJson: outcome === 'WON' ? ['Confirmed pilot rollout'] : [],
      nextActionsJson: status === 'OPEN' ? ['Follow up after demo', 'Send proposal'] : [],
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
        'Discover operating context',
        'The customer describes scale, business type, and product interest.',
        localMessageIds[0],
      ],
      [
        'Clarify the problem to solve',
        'The sales rep identifies follow-up and consultation quality challenges.',
        localMessageIds[2],
      ],
      [
        index % 4 === 0 ? 'Evaluate budget' : 'Evaluate implementation feasibility',
        index % 4 === 0
          ? 'The customer sets a budget limit and asks about pilot options.'
          : 'The customer asks about timeline and data integration.',
        localMessageIds[4],
      ],
      [
        'Align on next steps',
        outcome === 'WON'
          ? 'Both sides confirm the proposal and pilot scope.'
          : 'Both sides agree on demo and follow-up.',
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
                  title: `Demo ${product} with ${customerName}`,
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
        label: ['Problem confirmed', 'Move to evaluation', 'Next step agreed'][edgeIndex]!,
        description: 'Relationship inferred from conversation order and content.',
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
      title: `Overall experience for ${employeeName}`,
      summary: `${employeeName} performs well when clarifying the problem before introducing features, then locking a time-bound next step.`,
      playbookJson: {
        strengths: [
          'Ask quantitative questions',
          'Connect the solution to the pain point',
          'Confirm a clear schedule or pilot',
        ],
        avoid: ['Sending pricing before understanding scale', 'Follow-up without a goal'],
        recommendedFlow: [
          'Discovery',
          'Validate the problem',
          'Resolve objections',
          'Confirm next step',
        ],
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
        title: `Playbook for segment ${segment}`,
        summary:
          segment === 'Enterprise'
            ? 'Prioritize security, integration, and an acceptance-criteria pilot roadmap.'
            : segment === 'SME'
              ? 'Focus on quick value, scale-based cost, and short onboarding.'
              : segment === 'Startup'
                ? 'Lead with a small experiment, speed, and scalability.'
                : 'Explain briefly, make costs transparent, and offer simple choices.',
        playbookJson: {
          openingQuestion: `What is the most important goal for the ${segment} segment in the next 90 days?`,
          proofPoints:
            segment === 'Enterprise'
              ? ['Session security', 'Audit log', 'SLA']
              : ['Time to value', 'Small pilot', 'Flexible cost'],
          nextBestAction:
            segment === 'Enterprise'
              ? 'Propose a technical workshop'
              : 'Propose a demo with sample data',
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
                    ? 'Has a digital transformation program or governance requirement'
                    : 'Sales team is growing quickly and manual tracking no longer works',
                decisionPattern:
                  segment === 'Enterprise'
                    ? 'Many stakeholders, requires security review and procurement'
                    : 'Decides quickly when time-to-value and cost are clear',
                mainRisk:
                  segment === 'Enterprise'
                    ? 'Long cycle due to integration and approval'
                    : 'Loses interest if the demo does not create immediate value',
              }
            : undefined,
          observedMetrics: {
            sampleSize: experience.sampleSize,
            conversionRate: Number((0.32 + (experienceIndex % 9) * 0.055).toFixed(3)),
            averageResponseMinutes: 4 + (experienceIndex % 18),
            medianDaysToClose: 3 + (experienceIndex % 16),
            strongestStage: experienceIndex % 2 === 0 ? 'Handle objections' : 'Validate needs',
            improvementStage:
              experienceIndex % 3 === 0 ? 'Budget discovery' : 'Confirm stakeholder',
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
        'The system compares won deals with the rest, then checks whether resolving security concerns and confirming next steps appear more often in successful deals. The result is a positive signal, but the initial sample size is still small and should be monitored.',
      analysisJson: {
        question: 'Is a conversation more likely to be WON when security concerns are resolved?',
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
      label: 'Pilot deal was WON',
      excerpt: 'The customer confirmed the pilot after Telegram session security was addressed.',
      relevanceScore: 0.96,
    },
  });

  const methodConfigs = [
    {
      method: 'ANOMALY_DETECTION',
      type: 'ANOMALY',
      title: 'Anomaly detection',
      metric: 'response_time_zscore',
      algorithm: 'Robust Z-score with median absolute deviation',
    },
    {
      method: 'CLUSTERING',
      type: 'CUSTOMER_CLUSTER',
      title: 'Customer behavior cluster',
      metric: 'cluster_density',
      algorithm: 'K-medoids on normalized behavioral features',
    },
    {
      method: 'CLASSIFICATION',
      type: 'PROPENSITY',
      title: 'Close-likelihood classification',
      metric: 'propensity_score',
      algorithm: 'Rule classifier calibrated from historical outcomes',
    },
    {
      method: 'ASSOCIATION_RULE',
      type: 'ASSOCIATION',
      title: 'Product and need association rule',
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
        ? `${config.title}: ${3 + (index % 8)} conversations with unusually slow responses`
        : config.method === 'CLUSTERING'
          ? `${config.title}: ${segment} segment prioritizes ${product}`
          : config.method === 'CLASSIFICATION'
            ? `${config.title}: ${segment} shows a ${index % 3 === 0 ? 'risk' : 'positive'} signal`
            : `${config.title}: is interested in ${product} often appears with follow-up needs`;
    generatedInsights.push({
      id: insightId,
      organizationId: id.org,
      method: config.method,
      type: config.type,
      title,
      description:
        config.method === 'ASSOCIATION_RULE'
          ? `Customers asking about ${product} also tend to care about follow-up management; lift ${metricValue.toFixed(2)}.`
          : config.method === 'ANOMALY_DETECTION'
            ? `A group of conversations deviates significantly from the sales team response baseline and needs review.`
            : config.method === 'CLUSTERING'
              ? `The ${segment} segment has similar behavior in questions, objections, and next workflow steps.`
              : `A rule-based model groups customers by workflow signals, lead score, and response history.`,
      explanationText:
        config.method === 'ANOMALY_DETECTION'
          ? `The system uses the sales team's normal response time as a baseline, then finds transactions far from that baseline. ${3 + (index % 8)} cases show significantly slow responses; managers should check whether sales reps are overloaded, customers were missed, or sync data has issues.`
          : config.method === 'CLUSTERING'
            ? `The system does not pre-label customers; it groups customers with similar questions, objections, product interests, and workflows. A ${segment} segment stands out because it shares priority for ${product}; this segment can share a discovery and demo script.`
            : config.method === 'CLASSIFICATION'
              ? `From historical outcomes, the system checks lead score, demo requests, handled objections, and confirmed next steps. ${segment} customers in this group are classified as ${index % 3 === 0 ? 'needs risk monitoring' : 'positive close likelihood'} so sales reps can prioritize the right action.`
              : `The system counts how often need for ${product} and follow-up requests appear together, then compares it with overall frequency. Lift ${metricValue.toFixed(2)} shows the two signals co-occur more than usual, so sales reps should proactively suggest follow-up when customers mention this product.`,
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
          'Filter data by organization',
          'Normalize features',
          'Calculate metric in code',
          'Check sample size and confidence',
          'AI only explains the result',
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
        'Timeline and outcome were used in the calculation.',
      ],
      [
        'CUSTOMER',
        customerId,
        `${segment} · ${product}`,
        'Customer segment, lead score, and product interest.',
      ],
      [
        'WORKFLOW_NODE',
        workflowNodeId,
        'Workflow evidence',
        'Dynamic node and message evidence support the conclusion.',
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
      fullName: 'Michael Nguyen',
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
      fullName: 'Michael Nguyen',
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
      fullName: 'Alex Nguyen',
      telegramUserId: '200001',
      telegramUsername: 'an_demo',
      customerType: 'SME',
      productInterest: 'Sales CRM',
      leadScore: 82,
      notes: 'Interested in implementation timeline and cost.',
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
      fullName: 'Hannah Tran',
      telegramUserId: '200002',
      telegramUsername: 'ha_demo',
      customerType: 'Enterprise',
      productInterest: 'Conversation Intelligence',
      leadScore: 95,
      notes: 'Pilot package deal was won.',
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
      closeReason: 'Customer confirmed a 3-month pilot.',
    },
  });

  const texts = [
    [
      id.openConversation,
      'o1',
      'CUSTOMER',
      'Hi, I am looking for a solution to manage a 12-person sales team.',
      '2026-07-10T02:00:00Z',
    ],
    [
      id.openConversation,
      'o2',
      'EMPLOYEE',
      'Hi Alex. Which part of the process is the team struggling with most?',
      '2026-07-10T02:03:00Z',
    ],
    [
      id.openConversation,
      'o3',
      'CUSTOMER',
      'It is hard to track consultation quality, and customers get forgotten.',
      '2026-07-10T02:06:00Z',
    ],
    [
      id.openConversation,
      'o4',
      'EMPLOYEE',
      'We can sync conversations and flag customers who need follow-up.',
      '2026-07-10T02:10:00Z',
    ],
    [
      id.openConversation,
      'o5',
      'CUSTOMER',
      'Do sales reps need to change how they use Telegram?',
      '2026-07-10T02:16:00Z',
    ],
    [
      id.openConversation,
      'o6',
      'EMPLOYEE',
      'No, sales reps still chat from their personal accounts; the system only analyzes.',
      '2026-07-10T02:20:00Z',
    ],
    [
      id.openConversation,
      'o7',
      'CUSTOMER',
      'Please send the implementation timeline and pricing for 12 users.',
      '2026-07-11T09:25:00Z',
    ],
    [
      id.wonConversation,
      'w1',
      'CUSTOMER',
      'I need to review a conversation analytics solution for the telesales team.',
      '2026-07-01T03:00:00Z',
    ],
    [
      id.wonConversation,
      'w2',
      'EMPLOYEE',
      'How many consultants are currently on your team?',
      '2026-07-01T03:02:00Z',
    ],
    [
      id.wonConversation,
      'w3',
      'CUSTOMER',
      'Around 30 people, mostly using Telegram.',
      '2026-07-01T03:05:00Z',
    ],
    [
      id.wonConversation,
      'w4',
      'EMPLOYEE',
      'I suggest a 3-week pilot with 5 users to measure effectiveness.',
      '2026-07-01T03:12:00Z',
    ],
    [
      id.wonConversation,
      'w5',
      'CUSTOMER',
      'How is Telegram session data protected?',
      '2026-07-02T04:00:00Z',
    ],
    [
      id.wonConversation,
      'w6',
      'EMPLOYEE',
      'Sessions are encrypted with AES-256-GCM; AI and bots cannot access them.',
      '2026-07-02T04:05:00Z',
    ],
    [
      id.wonConversation,
      'w7',
      'CUSTOMER',
      'Good. I need a daily report for managers.',
      '2026-07-03T06:00:00Z',
    ],
    [
      id.wonConversation,
      'w8',
      'EMPLOYEE',
      'The report includes conversion, follow-up, insights, and is stored in object storage.',
      '2026-07-03T06:04:00Z',
    ],
    [
      id.wonConversation,
      'w9',
      'CUSTOMER',
      'Please send me the pilot proposal.',
      '2026-07-05T07:00:00Z',
    ],
    [
      id.wonConversation,
      'w10',
      'EMPLOYEE',
      'I sent the proposal. Please review the scope and timeline.',
      '2026-07-05T07:08:00Z',
    ],
    [
      id.wonConversation,
      'w11',
      'CUSTOMER',
      'I confirm the 3-month pilot. Please proceed with the contract.',
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
        'The customer has a 12-person sales team, needs to track consultation quality, and wants to prevent forgotten customers. Waiting for timeline and pricing.',
      customerNeedsJson: ['conversation quality', 'follow-up'],
      customerConcernsJson: ['adoption', 'implementation time', 'price'],
      productsJson: ['Sales CRM'],
      nextActionsJson: ['Send timeline', 'Send pricing'],
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
        'The enterprise customer confirmed a 3-month pilot after session security and daily reports were addressed.',
      customerNeedsJson: ['conversation analytics', 'manager report'],
      customerConcernsJson: ['Telegram session security'],
      productsJson: ['Conversation Intelligence'],
      commitmentsJson: ['3-month pilot'],
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
      'Customer describes sales-team management problem',
      'Customer has a 12-person team and needs visibility into consultation quality.',
      0.94,
      '20000000-0000-4000-8000-000000000001',
    ],
    [
      '30000000-0000-4000-8000-000000000002',
      id.openGraph,
      'Clarify the risk of forgotten customers',
      'Customer says follow-up cannot be tracked and is sometimes missed.',
      0.91,
      '20000000-0000-4000-8000-000000000003',
    ],
    [
      '30000000-0000-4000-8000-000000000003',
      id.openGraph,
      'Customer checks impact on the current workflow',
      'Customer wants to keep the sales rep Telegram experience unchanged.',
      0.88,
      '20000000-0000-4000-8000-000000000005',
    ],
    [
      '30000000-0000-4000-8000-000000000004',
      id.openGraph,
      'Requests timeline and pricing',
      'Customer moved into evaluating implementation and cost.',
      0.96,
      '20000000-0000-4000-8000-000000000007',
    ],
    [
      '30000000-0000-4000-8000-000000000005',
      id.wonGraph,
      'Confirms pilot after security review',
      'Customer agrees to a 3-month pilot after receiving enough information.',
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
          customerIntent: title.includes('pricing') ? 'evaluate_price' : 'explore_solution',
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
      'From context to pain point',
    ],
    [
      '40000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003',
      'After hearing the solution',
    ],
    [
      '40000000-0000-4000-8000-000000000003',
      '30000000-0000-4000-8000-000000000003',
      '30000000-0000-4000-8000-000000000004',
      'Move to commercial evaluation',
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
          title: 'Sales Intelligence solution demo',
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
        'For a 12-person team, I suggest a 2-week pilot. I will send two pricing options so you can compare easily.',
      shortRationale: 'Answer the timeline directly and offer pricing options.',
      confidence: 0.9,
      status: 'GENERATED',
      modelName: 'fake-ai-v1',
      promptVersion: 'suggestion-v1',
      metadataJson: {
        appointment: {
          detected: true,
          title: 'Sales Intelligence solution demo',
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
      title: 'Conversations with security concerns addressed show positive signals',
      description:
        'In the demo data, the WON deal was confirmed after the sales rep clearly explained Telegram session protection.',
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
        fullName: 'Alex Nguyen',
        companyName: 'Prosperity Digital',
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
        fullName: 'Hannah Tran',
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
