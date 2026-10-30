import 'dotenv/config';
import { PrismaClient, FileCategory, ProfileVisibility, EmploymentType, WorkplaceType } from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateDemoPdf, DemoCandidateCvData } from './demo-pdf-builder';
import { ensureCompanyLogo } from './seed-company-logos';
import { PROGRESS_HIRE_EMAIL } from '../src/common/progress-contact';

const prisma = new PrismaClient();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function seedDemoData(client: PrismaClient = prisma): Promise<void> {
  console.log('--- Starting Demo Data Seeding (20+ Jobs & 20+ Candidate Profiles with CV PDFs) ---');

  // 1. Roles setup
  const roleNames = ['admin', 'moderator', 'employer', 'candidate'];
  const roles = new Map<string, number>();
  for (const name of roleNames) {
    const role = await client.role.upsert({
      where: { name },
      create: { name, description: `${name} role` },
      update: {},
    });
    roles.set(name, role.id);
  }

  // 2. Admin user
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const admin = await client.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: await argon2.hash('ChangeMe123!', { type: argon2.argon2id }),
    },
    update: {},
  });
  await client.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.get('admin')! } },
    create: { userId: admin.id, roleId: roles.get('admin')! },
    update: {},
  });

  // 3. Ensure Storage Directory exists
  const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? './storage');
  const cvDemoDir = path.resolve(storageRoot, 'cv', 'demo');
  await fs.mkdir(cvDemoDir, { recursive: true });

  // 4. Ensure Categories
  const categoriesMap = new Map<string, string>();
  const categoriesList = await client.jobCategory.findMany();
  for (const c of categoriesList) {
    categoriesMap.set(c.slug, c.id);
  }

  // 5. Ensure Locations
  const locationsMap = new Map<string, string>();
  const locationsList = await client.location.findMany();
  for (const l of locationsList) {
    locationsMap.set(l.slug, l.id);
  }

  // 6. Seed Partner Companies
  console.log('Seeding enterprise partner companies...');
  const itIndustry = await client.industry.findFirst({ where: { slug: 'information-technology' } });
  const mfgIndustry = await client.industry.findFirst({ where: { slug: 'manufacturing' } });
  const bankIndustry = await client.industry.findFirst({ where: { slug: 'banking-and-financial-services' } });
  const healthIndustry = await client.industry.findFirst({ where: { slug: 'healthcare' } });

  const partnerCompanies = [
    {
      name: 'Ethio Cloud & Software Solutions',
      slug: 'ethio-cloud-software-solutions',
      industryId: itIndustry?.id,
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      description: 'Leading Ethiopian enterprise cloud engineering, fintech integration, and software development provider.',
    },
    {
      name: 'Dukem Steel & Iron Manufacturing',
      slug: 'dukem-steel-iron-manufacturing',
      industryId: mfgIndustry?.id,
      city: 'Dukem',
      region: 'Oromia',
      description: 'Heavy industrial manufacturing plant specializing in construction rebar, structural steel, and fabrication at Eastern Industry Zone Dukem.',
    },
    {
      name: 'Mojo Logistics & Transport PLC',
      slug: 'mojo-logistics-transport-plc',
      industryId: mfgIndustry?.id,
      city: 'Adama',
      region: 'Oromia',
      description: 'Premier intermodal freight forwarding, dry-port container logistics, and industrial supply chain operations.',
    },
    {
      name: 'Adama Garment & Textile Industries',
      slug: 'adama-garment-textile-industries',
      industryId: mfgIndustry?.id,
      city: 'Adama',
      region: 'Oromia',
      description: 'Export-oriented apparel manufacturer producing woven fabrics, institutional uniforms, and industrial workwear.',
    },
    {
      name: 'Awash Financial Consulting Group',
      slug: 'awash-financial-consulting-group',
      industryId: bankIndustry?.id,
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      description: 'Certified public accounting, corporate tax audit, IFRS compliance, and financial management consultancy in Ethiopia.',
    },
    {
      name: 'Abyssinia Health & Pharmaceutical',
      slug: 'abyssinia-health-pharmaceutical',
      industryId: healthIndustry?.id,
      city: 'Bishoftu',
      region: 'Oromia',
      description: 'Licensed pharmaceutical manufacturing, clinical diagnostics, and medical supply distributor headquartered in Bishoftu.',
    },
  ];

  const companyMap = new Map<string, string>();
  for (const comp of partnerCompanies) {
    const created = await client.company.upsert({
      where: { slug: comp.slug },
      create: {
        name: comp.name,
        slug: comp.slug,
        industryId: comp.industryId,
        city: comp.city,
        region: comp.region,
        description: comp.description,
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        canSelfPublishJobs: true,
      },
      update: {
        name: comp.name,
        city: comp.city,
        region: comp.region,
        companySize: null,
        verificationStatus: 'verified',
        canSelfPublishJobs: true,
      },
    });
    companyMap.set(comp.slug, created.id);
    await ensureCompanyLogo(client, created);
  }

  // Also include the existing Demo Technology PLC
  const demoComp = await client.company.findFirst({ where: { slug: 'demo-technology-plc' } });
  if (demoComp) {
    companyMap.set('demo-technology-plc', demoComp.id);
    await ensureCompanyLogo(client, demoComp);
  }

  // 7. Seed 22 Diverse & Clustered Vacancies
  console.log('Seeding 22 open published jobs across sectors...');
  const addisLocId = locationsMap.get('addis-ababa-addis-ababa');
  const adamaLocId = locationsMap.get('adama-oromia');
  const bishoftuLocId = locationsMap.get('bishoftu-oromia');
  const hawassaLocId = locationsMap.get('hawassa-sidama');
  const bahirLocId = locationsMap.get('bahir-dar-amhara');

  const itCatId = categoriesMap.get('information-technology');
  const accCatId = categoriesMap.get('accounting-and-finance');
  const engCatId = categoriesMap.get('engineering');
  const logCatId = categoriesMap.get('logistics-and-supply-chain');
  const salesCatId = categoriesMap.get('sales-and-marketing');
  const hrCatId = categoriesMap.get('human-resources');
  const healthCatId = categoriesMap.get('health-care');

  const jobsData = [
    // --- Sector: Information Technology (Clustered) ---
    {
      companySlug: 'ethio-cloud-software-solutions',
      title: 'Senior Full Stack Engineer',
      slug: 'senior-full-stack-engineer-adama',
      category: itCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'hybrid' as WorkplaceType,
      experienceMin: 3.0,
      experienceMax: 6.0,
      salaryMin: 35000,
      salaryMax: 50000,
      summary: 'Design, architect, and deliver responsive web applications and backend APIs using React, Node.js, and PostgreSQL for enterprise clients.',
      responsibilities: 'Architect modular backend microservices.\nBuild reactive, mobile-first frontend interfaces.\nImplement continuous integration pipelines and automated testing.\nMentor junior software engineers and conduct code reviews.',
      requirements: "Bachelor's Degree in Computer Science or Software Engineering.\n3+ years experience in modern JavaScript/TypeScript, React, Node.js.\nProficiency with relational databases (PostgreSQL/MySQL).\nStrong problem-solving and English communication skills.",
      education: "Bachelor's Degree",
      daysToDeadline: 25,
    },
    {
      companySlug: 'ethio-cloud-software-solutions',
      title: 'Frontend React Developer',
      slug: 'frontend-react-developer-addis',
      category: itCatId,
      location: addisLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'hybrid' as WorkplaceType,
      experienceMin: 1.5,
      experienceMax: 4.0,
      salaryMin: 22000,
      salaryMax: 32000,
      summary: 'Create responsive, accessible, and fast user interfaces using modern React, TypeScript, and modern CSS frameworks.',
      responsibilities: 'Translate UI/UX wireframes into performant, clean React components.\nIntegrate REST and GraphQL APIs.\nEnsure cross-browser compatibility and tablet/mobile responsiveness.\nOptimize web applications for speed and scalability.',
      requirements: "Bachelor's Degree in Information Technology or related discipline.\n2+ years hands-on React.js and TypeScript experience.\nDeep understanding of CSS Grid, Flexbox, and state management.\nPortfolio of active web projects or GitHub profile.",
      education: "Bachelor's Degree",
      daysToDeadline: 18,
    },
    {
      companySlug: 'mojo-logistics-transport-plc',
      title: 'Network & Systems Administrator',
      slug: 'network-systems-administrator-bishoftu',
      category: itCatId,
      location: bishoftuLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 5.0,
      salaryMin: 24000,
      salaryMax: 34000,
      summary: 'Oversee IT infrastructure, secure enterprise LAN/WAN networks, server virtualization, and warehouse handheld hardware systems.',
      responsibilities: 'Administer Cisco routing, switching, and firewall security appliances.\nMaintain on-premise Active Directory and cloud backup storage.\nProvide tier-2 technical support to dry-port dispatch teams.\nMonitor network uptime and disaster recovery routines.',
      requirements: "Bachelor's Degree in Computer Engineering, IT, or Electrical Engineering.\nCCNA or MCSA certification preferred.\nExperience in network cabling, VPN setup, and Linux/Windows server administration.",
      education: "Bachelor's Degree",
      daysToDeadline: 14,
    },
    {
      companySlug: 'dukem-steel-iron-manufacturing',
      title: 'Junior IT Support Specialist',
      slug: 'junior-it-support-specialist-dukem',
      category: itCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 0.0,
      experienceMax: 2.0,
      salaryMin: 15000,
      salaryMax: 20000,
      summary: 'Entry-level position for a motivated IT or Computer Science graduate to provide technical workstation and network hardware troubleshooting.',
      responsibilities: 'Install, configure, and troubleshoot factory office workstations and printers.\nSupport staff with ERP software access and Microsoft 365 issues.\nMaintain IT asset inventory and conduct routine maintenance.',
      requirements: "BSc in Computer Science, Information Technology, or Diploma in Hardware.\nFresh graduates welcomed.\nFamiliarity with Windows 11, basic TCP/IP networking, and hardware diagnostics.",
      education: "Bachelor's Degree",
      daysToDeadline: 30,
    },

    // --- Sector: Accounting & Finance (Clustered) ---
    {
      companySlug: 'awash-financial-consulting-group',
      title: 'Senior Financial Accountant',
      slug: 'senior-financial-accountant-addis',
      category: accCatId,
      location: addisLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 4.0,
      experienceMax: 8.0,
      salaryMin: 32000,
      salaryMax: 45000,
      summary: 'Lead monthly financial closing, statutory Ethiopian tax filings, and preparation of IFRS-compliant financial statements.',
      responsibilities: 'Manage general ledger, accounts payable, accounts receivable, and fixed assets.\nPrepare monthly balance sheet reconciliations and VAT/WHT declaration reports.\nLiaise with external auditors and the Ministry of Revenue.\nAnalyze financial variance and generate executive cash-flow forecasts.',
      requirements: "BA in Accounting and Finance from an accredited university.\n4+ years experience; ACCA/CPA qualification is a distinct plus.\nAdvanced proficiency in Peachtree/QuickBooks, SAP, and MS Excel.",
      education: "Bachelor's Degree",
      daysToDeadline: 20,
    },
    {
      companySlug: 'adama-garment-textile-industries',
      title: 'Cost & Management Accountant',
      slug: 'cost-management-accountant-adama',
      category: accCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 3.0,
      experienceMax: 6.0,
      salaryMin: 26000,
      salaryMax: 36000,
      summary: 'Compute and analyze production manufacturing costs, standard costing variances, raw material inventory valuations, and cost reduction models.',
      responsibilities: 'Calculate bill of materials (BOM) production unit costs.\nMonitor fabric wastage, direct labor hours, and factory overhead allocations.\nConduct quarterly physical stock counts at Adama textile warehouses.\nDeliver monthly cost of goods manufactured (COGM) reports to plant managers.',
      requirements: "BA Degree in Accounting & Finance or Cost Accounting.\n3+ years experience in manufacturing or garment industry.\nHigh analytical acumen and mastery of complex financial modeling in Excel.",
      education: "Bachelor's Degree",
      daysToDeadline: 12,
    },
    {
      companySlug: 'dukem-steel-iron-manufacturing',
      title: 'Junior Payroll & Accounts Clerk',
      slug: 'junior-payroll-accounts-clerk-dukem',
      category: accCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 0.0,
      experienceMax: 2.0,
      salaryMin: 14000,
      salaryMax: 18000,
      summary: 'Entry-level accounting role responsible for processing bi-weekly factory employee payroll, attendance verification, and voucher filing.',
      responsibilities: 'Process factory workers attendance biometric records and overtime sheets.\nCalculate income tax, pension contributions, and net payroll.\nPrepare payment vouchers, check requests, and petty cash disbursements.',
      requirements: "BA Degree in Accounting & Finance.\nFresh graduates with high GPA strongly encouraged to apply.\nStrong arithmetic skill, integrity, and attention to detail.",
      education: "Bachelor's Degree",
      daysToDeadline: 28,
    },
    {
      companySlug: 'mojo-logistics-transport-plc',
      title: 'Internal Audit Officer',
      slug: 'internal-audit-officer-adama',
      category: accCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.5,
      experienceMax: 5.0,
      salaryMin: 24000,
      salaryMax: 33000,
      summary: 'Evaluate internal operational controls, compliance with transport tariff regulations, and audit financial expenditures.',
      responsibilities: 'Conduct periodic financial and operational risk audits.\nAudit fleet fuel expenditures and spare parts inventory reconciliations.\nReport procedural deficiencies and recommend corrective controls.',
      requirements: "BA in Accounting, Auditing, or Business Administration.\n2+ years auditing experience.\nHigh ethical standard and professional skepticism.",
      education: "Bachelor's Degree",
      daysToDeadline: 21,
    },

    // --- Sector: Engineering & Manufacturing (Clustered) ---
    {
      companySlug: 'dukem-steel-iron-manufacturing',
      title: 'Senior Mechanical Maintenance Engineer',
      slug: 'senior-mechanical-maintenance-engineer-dukem',
      category: engCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 4.0,
      experienceMax: 8.0,
      salaryMin: 36000,
      salaryMax: 52000,
      summary: 'Lead mechanical maintenance teams on heavy rolling mills, induction melting furnaces, overhead cranes, and hydraulic systems.',
      responsibilities: 'Implement preventive and predictive maintenance schedules for plant machinery.\nDiagnose mechanical failures, gearboxes, bearings, and hydraulic circuits.\nSupervise overhaul operations to minimize manufacturing downtime.\nEnforce rigorous safety standards across furnace and rolling areas.',
      requirements: "BSc in Mechanical Engineering or Electromechanical Engineering.\n4+ years heavy manufacturing experience (steel, cement, or paper).\nKnowledge of AutoCAD and predictive vibration analysis.",
      education: "Bachelor's Degree",
      daysToDeadline: 16,
    },
    {
      companySlug: 'adama-garment-textile-industries',
      title: 'Industrial Electrical Engineer',
      slug: 'industrial-electrical-engineer-adama',
      category: engCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 5.0,
      salaryMin: 25000,
      salaryMax: 35000,
      summary: 'Maintain industrial textile automation, spinning and weaving electrical panels, PLCs, motor control centers (MCC), and substation equipment.',
      responsibilities: 'Troubleshoot PLC controls (Siemens/Delta) and variable frequency drives (VFD).\nPerform routine servicing of transformers, generators, and distribution switchboards.\nDesign electrical schematic upgrades for factory line expansions.',
      requirements: "BSc in Electrical Engineering or Electrical & Computer Engineering.\n2+ years industrial electrical experience.\nAbility to read circuit blueprints and troubleshoot high-voltage machinery.",
      education: "Bachelor's Degree",
      daysToDeadline: 22,
    },
    {
      companySlug: 'adama-garment-textile-industries',
      title: 'Quality Assurance Supervisor',
      slug: 'quality-assurance-supervisor-adama',
      category: engCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 4.0,
      salaryMin: 20000,
      salaryMax: 28000,
      summary: 'Supervise garment inline and end-of-line quality inspections to ensure full compliance with international export standards.',
      responsibilities: 'Manage team of QA inspectors across sewing, cutting, and finishing lines.\nPerform tensile, color fastness, and dimensional stability tests on fabrics.\nImplement ISO 9001 quality management protocols.\nReport defect rates and conduct root-cause corrective action meetings.',
      requirements: "BSc in Textile Engineering, Industrial Engineering, or Garment Technology.\n2+ years experience in quality management.\nStrong leadership and analytical problem-solving skills.",
      education: "Bachelor's Degree",
      daysToDeadline: 19,
    },
    {
      companySlug: 'abyssinia-health-pharmaceutical',
      title: 'Chemical & Process Engineer',
      slug: 'chemical-process-engineer-bishoftu',
      category: engCatId,
      location: bishoftuLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 3.0,
      experienceMax: 6.0,
      salaryMin: 30000,
      salaryMax: 42000,
      summary: 'Oversee pharmaceutical manufacturing synthesis, liquid formulations, cleanroom HVAC controls, and Good Manufacturing Practice (GMP) compliance.',
      responsibilities: 'Monitor chemical compounding batches and filtration processes.\nEnsure strict adherence to WHO and EFDA GMP pharmaceutical standards.\nPerform process optimization to increase batch yield and purity.\nMaintain documentation for validation protocols and standard operating procedures (SOP).',
      requirements: "BSc in Chemical Engineering, Industrial Chemistry, or Bio-Chemical Engineering.\n3+ years pharmaceutical, food, or chemical manufacturing experience.\nDeep familiarity with EFDA regulations.",
      education: "Bachelor's Degree",
      daysToDeadline: 27,
    },

    // --- Sector: Logistics & Supply Chain (Clustered) ---
    {
      companySlug: 'mojo-logistics-transport-plc',
      title: 'Supply Chain Operations Manager',
      slug: 'supply-chain-operations-manager-adama',
      category: logCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 5.0,
      experienceMax: 10.0,
      salaryMin: 40000,
      salaryMax: 60000,
      summary: 'Direct intermodal container logistics, dry-port freight clearances, customs transit corridors, and fleet operations across Ethiopia.',
      responsibilities: 'Lead multi-hub logistics operations between Djibouti corridor and Mojo dry port.\nNegotiate transportation carrier contracts and reduce transit dwell times.\nManage fleet of 50+ heavy trucks and coordinate with Ethiopian Customs Commission.\nOptimize inventory replenishment strategies for industrial enterprise clients.',
      requirements: "Master's or Bachelor's in Logistics, Supply Chain Management, or Management.\n5+ years managerial logistics experience.\nIn-depth knowledge of multimodal freight operations and customs documentation.",
      education: "Bachelor's Degree",
      daysToDeadline: 15,
    },
    {
      companySlug: 'dukem-steel-iron-manufacturing',
      title: 'Warehouse & Inventory Controller',
      slug: 'warehouse-inventory-controller-dukem',
      category: logCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 5.0,
      salaryMin: 21000,
      salaryMax: 30000,
      summary: 'Supervise raw material scrap yards, finished rebar warehouses, bin locations, and inventory ERP tracking.',
      responsibilities: 'Oversee goods receiving, weighbridge verification, and warehouse dispatching.\nPerform weekly cycle counts and resolve inventory discrepancies in ERP.\nEnforce warehouse safety, forklift operation rules, and palletizing standards.\nCoordinate shipments with transport dispatchers.',
      requirements: "BA/BSc in Logistics and Supply Chain Management or Business Administration.\n2+ years warehousing experience in an industrial setting.\nProficiency with inventory management systems.",
      education: "Bachelor's Degree",
      daysToDeadline: 23,
    },
    {
      companySlug: 'mojo-logistics-transport-plc',
      title: 'Freight Clearing & Forwarding Officer',
      slug: 'freight-clearing-forwarding-officer-addis',
      category: logCatId,
      location: addisLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 1.5,
      experienceMax: 4.0,
      salaryMin: 20000,
      salaryMax: 28000,
      summary: 'Prepare and process customs declarations, transit permits, bill of ladings, and inspection documentations.',
      responsibilities: 'Process import/export declarations through the Ethiopian Customs ASYCUDA system.\nLiaise with shipping lines, banks, and customs officers.\nTrack shipment consignments from Djibouti port to inland terminals.',
      requirements: "BA Degree in Logistics & Supply Chain, Economics, or Business.\nValid Customs Clearing Certificate (CoC) preferred.\nFluent in Amharic and English.",
      education: "Bachelor's Degree",
      daysToDeadline: 17,
    },

    // --- Sector: Sales & Marketing ---
    {
      companySlug: 'ethio-cloud-software-solutions',
      title: 'Corporate B2B Sales Manager',
      slug: 'corporate-b2b-sales-manager-addis',
      category: salesCatId,
      location: addisLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'hybrid' as WorkplaceType,
      experienceMin: 4.0,
      experienceMax: 8.0,
      salaryMin: 35000,
      salaryMax: 55000,
      summary: 'Drive revenue growth by acquiring enterprise corporate clients, commercial banks, and government agencies for IT cloud solutions.',
      responsibilities: 'Prospect, pitch, and close high-value B2B enterprise software contracts.\nCultivate relationships with CXOs and IT directors.\nPrepare corporate proposals, bid documents, and tenders.\nLead and coach account executive sales representatives.',
      requirements: "BA in Marketing, Business Administration, or Computer Science.\n4+ years corporate B2B technology sales experience.\nOutstanding negotiation, presentation, and relationship building abilities.",
      education: "Bachelor's Degree",
      daysToDeadline: 26,
    },
    {
      companySlug: 'adama-garment-textile-industries',
      title: 'Sales & Customer Relations Officer',
      slug: 'sales-customer-relations-officer-adama',
      category: salesCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 1.0,
      experienceMax: 3.0,
      salaryMin: 18000,
      salaryMax: 25000,
      summary: 'Manage commercial buyer accounts, wholesale garment orders, customer inquiries, and showroom visits.',
      responsibilities: 'Handle domestic wholesale buyer inquiries and sample distribution.\nFollow up on order fulfillment, delivery schedules, and customer invoices.\nParticipate in regional trade expos and promotional events.',
      requirements: "BA in Marketing Management, Public Relations, or Business.\n1+ years sales experience.\nStrong interpersonal skills; fluency in Amharic and Afaan Oromo is a strong asset.",
      education: "Bachelor's Degree",
      daysToDeadline: 24,
    },

    // --- Sector: Human Resources & Management ---
    {
      companySlug: 'dukem-steel-iron-manufacturing',
      title: 'Senior HR & Administration Manager',
      slug: 'senior-hr-administration-manager-dukem',
      category: hrCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 5.0,
      experienceMax: 10.0,
      salaryMin: 38000,
      salaryMax: 55000,
      summary: 'Direct all human resources operations, industrial labor relations, staffing, performance appraisal, and factory administration for 400+ staff.',
      responsibilities: 'Ensure compliance with Ethiopian Labor Proclamation 1156/2019.\nLead talent acquisition, onboarding, and annual performance appraisals.\nHandle industrial employee grievances and collective bargaining discussions.\nSupervise factory security, transport, clinic, and catering services.',
      requirements: "BA or Master's in Management, Human Resources, or Business Administration.\n5+ years industrial manufacturing HR experience.\nDeep mastery of Ethiopian labor law and conflict resolution.",
      education: "Bachelor's Degree",
      daysToDeadline: 14,
    },
    {
      companySlug: 'adama-garment-textile-industries',
      title: 'Talent Acquisition & Training Officer',
      slug: 'talent-acquisition-training-officer-adama',
      category: hrCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 5.0,
      salaryMin: 22000,
      salaryMax: 30000,
      summary: 'Manage recruitment pipelines, operator screening, onboarding, and workforce upskilling programs.',
      responsibilities: 'Partner with Progress Manpower for candidate screening and interviews.\nOrganize vocational skills training for machine operators.\nMaintain employee personnel files and training attendance records.',
      requirements: "BA in Management, Human Resources, or Psychology.\n2+ years HR recruitment experience.\nGood communication and presentation skills.",
      education: "Bachelor's Degree",
      daysToDeadline: 20,
    },

    // --- Sector: Health Care & Safety ---
    {
      companySlug: 'dukem-steel-iron-manufacturing',
      title: 'Occupational Health & Safety (OHS) Officer',
      slug: 'occupational-health-safety-officer-dukem',
      category: healthCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 3.0,
      experienceMax: 6.0,
      salaryMin: 28000,
      salaryMax: 38000,
      summary: 'Implement and enforce zero-harm industrial safety standards, personal protective equipment (PPE) compliance, and accident prevention protocols.',
      responsibilities: 'Conduct daily factory hazard inspections across steel mills.\nInvestigate workplace incidents and prepare root cause reports.\nOrganize regular fire drill exercises, emergency response, and first-aid trainings.\nEnsure regulatory compliance with regional Labor & Social Affairs safety codes.',
      requirements: "BSc in Environmental Health, Occupational Health & Safety, or Chemical Engineering.\n3+ years industrial safety experience.\nNEBOSH or IOSH certification is an added advantage.",
      education: "Bachelor's Degree",
      daysToDeadline: 11,
    },
    {
      companySlug: 'abyssinia-health-pharmaceutical',
      title: 'Quality Control Laboratory Analyst',
      slug: 'quality-control-laboratory-analyst-bishoftu',
      category: healthCatId,
      location: bishoftuLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 5.0,
      salaryMin: 24000,
      salaryMax: 34000,
      summary: 'Perform chemical assays, dissolution tests, HPLC chromatography, and microbiological tests on active pharmaceutical ingredients.',
      responsibilities: 'Analyze raw material and finished product samples using HPLC, UV-Vis spectrophotometers.\nDocument test results following Good Laboratory Practices (GLP).\nConduct stability testing and prepare analytical certificates of analysis (CoA).',
      requirements: "BSc in Pharmacy, Applied Chemistry, or Industrial Chemistry.\n2+ years analytical laboratory experience.\nRigorous attention to experimental protocol.",
      education: "Bachelor's Degree",
      daysToDeadline: 21,
    },
    {
      companySlug: 'adama-garment-textile-industries',
      title: 'Industrial Clinic Nurse',
      slug: 'industrial-clinic-nurse-adama',
      category: healthCatId,
      location: adamaLocId,
      employmentType: 'full_time' as EmploymentType,
      workplaceType: 'on_site' as WorkplaceType,
      experienceMin: 2.0,
      experienceMax: 5.0,
      salaryMin: 18000,
      salaryMax: 26000,
      summary: 'Provide on-site primary medical triage, emergency first aid, occupational health screenings, and medical referrals for factory personnel.',
      responsibilities: 'Provide outpatient medical care and initial triage for factory workforce.\nAdminister emergency first aid and manage industrial clinic inventory.\nMaintain medical sick leave records and coordinate with referral hospitals.',
      requirements: "BSc or Diploma in Clinical Nursing.\nValid professional license from Ethiopian Ministry of Health.\n2+ years clinical experience, preferably in an institutional or industrial setting.",
      education: "Bachelor's Degree",
      daysToDeadline: 29,
    },
  ];

  for (const [idx, j] of jobsData.entries()) {
    const compId = companyMap.get(j.companySlug);
    if (!compId) continue;

    const deadline = new Date();
    deadline.setUTCDate(deadline.getUTCDate() + j.daysToDeadline);

    const ref = `PRG-${String(idx + 1).padStart(3, '0')}`;

    await client.job.upsert({
      where: { slug: j.slug },
      create: {
        companyId: compId,
        createdBy: admin.id,
        categoryId: j.category ?? itCatId!,
        locationId: j.location ?? adamaLocId,
        title: j.title,
        slug: j.slug,
        referenceCode: ref,
        summary: j.summary,
        description: `${j.summary}\n\nKey Responsibilities:\n${j.responsibilities}\n\nRequirements:\n${j.requirements}`,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        educationRequirement: j.education,
        experienceMinYears: j.experienceMin,
        experienceMaxYears: j.experienceMax,
        employmentType: j.employmentType,
        workplaceType: j.workplaceType,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: 'ETB',
        salaryVisibility: true,
        vacanciesCount: 1,
        applicationMethod: 'admin',
        applicationEmail: PROGRESS_HIRE_EMAIL,
        applicationInstructions: 'Apply directly through Progress Manpower Supply & Training PLC by submitting your CV.',
        status: 'published',
        postedAt: new Date(),
        applicationDeadline: deadline,
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      update: {
        title: j.title,
        summary: j.summary,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        educationRequirement: j.education,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryVisibility: true,
        status: 'published',
        applicationDeadline: deadline,
        applicationEmail: PROGRESS_HIRE_EMAIL,
      },
    });
  }

  // 8. Seed 20 Candidate Accounts with Full Profiles & Generated Demo CVs
  console.log('Seeding 20 demo candidate accounts with full profiles and CV PDFs...');

  const candidatesData: Array<{
    firstName: string;
    lastName: string;
    headline: string;
    summary: string;
    city: string;
    region: string;
    careerLevel: string;
    yearsExperience: number;
    availabilityStatus: string;
    gender: string;
    experiences: Array<{
      jobTitle: string;
      companyName: string;
      workingCity: string;
      employmentType: string;
      startDate: string;
      endDate?: string;
      isCurrent: boolean;
      salary?: string;
      description: string;
    }>;
    educations: Array<{
      institution: string;
      qualification: string;
      fieldOfStudy: string;
      startDate: string;
      endDate: string;
      grade?: string;
      description?: string;
    }>;
    skills: string[];
    languages: Array<{ name: string; proficiency: string; reading?: string; writing?: string; listening?: string }>;
    certifications?: Array<{ name: string; issuer: string; issuedDate: string; credentialId?: string }>;
  }> = [
    // --- Cluster 1: Software & IT (ASTU Computer Science / Software Engineering Graduates) ---
    {
      firstName: 'Abebe',
      lastName: 'Bekele',
      headline: 'Full Stack Software Engineer',
      summary: 'Passionate software developer with 3+ years experience building web applications, REST APIs, and database schemas with TypeScript, React, and Node.js.',
      city: 'Adama',
      region: 'Oromia',
      careerLevel: 'Mid-Senior Level',
      yearsExperience: 3.5,
      availabilityStatus: 'immediately_available',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Software Engineer',
          companyName: 'Adama Tech Hub',
          workingCity: 'Adama',
          employmentType: 'full_time',
          startDate: '2023-01-15',
          isCurrent: true,
          salary: 'ETB 38,000 / month',
          description: 'Engineered high-throughput REST APIs and customer dashboards using Node.js, Express, PostgreSQL, and React.',
        },
        {
          jobTitle: 'Junior Web Developer',
          companyName: 'Ethio Soft Solutions',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2021-08-01',
          endDate: '2022-12-31',
          isCurrent: false,
          salary: 'ETB 22,000 / month',
          description: 'Developed responsive client web portals and fixed critical frontend rendering bugs.',
        },
      ],
      educations: [
        {
          institution: 'Adama Science and Technology University (ASTU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Computer Science & Engineering',
          startDate: '2017-09-01',
          endDate: '2021-07-15',
          grade: '3.78 / 4.00 (Very Great Distinction)',
          description: 'Senior project: Distributed e-commerce inventory platform.',
        },
      ],
      skills: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Project Management'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'Afaan Oromo', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Professional', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
      certifications: [
        { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', issuedDate: '2023-05-10', credentialId: 'AWS-83921' },
      ],
    },
    {
      firstName: 'Yohannes',
      lastName: 'Haile',
      headline: 'Frontend React Developer',
      summary: 'Frontend specialist focused on performant, accessible UI/UX with modern React, Next.js, and CSS design systems. Fellow ASTU graduate.',
      city: 'Adama',
      region: 'Oromia',
      careerLevel: 'Mid Level',
      yearsExperience: 2.0,
      availabilityStatus: 'available_with_notice',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Frontend Developer',
          companyName: 'Great Rift Digital',
          workingCity: 'Adama',
          employmentType: 'full_time',
          startDate: '2024-02-01',
          isCurrent: true,
          salary: 'ETB 28,000 / month',
          description: 'Building mobile-first dashboards and component libraries for corporate clients.',
        },
      ],
      educations: [
        {
          institution: 'Adama Science and Technology University (ASTU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Software Engineering',
          startDate: '2019-09-01',
          endDate: '2023-07-20',
          grade: '3.65 / 4.00 (Great Distinction)',
        },
      ],
      skills: ['React', 'JavaScript', 'TypeScript', 'Communication', 'Microsoft Excel'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Tigist',
      lastName: 'Alemu',
      headline: 'Junior Backend Developer',
      summary: 'Recent ASTU graduate with strong foundation in data structures, algorithms, Node.js, Express, and SQL database design. Quick learner eager to contribute.',
      city: 'Bishoftu',
      region: 'Oromia',
      careerLevel: 'Entry Level',
      yearsExperience: 0.5,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'Software Engineering Intern',
          companyName: 'Oromia ICT Center',
          workingCity: 'Adama',
          employmentType: 'internship',
          startDate: '2024-08-01',
          endDate: '2025-01-31',
          isCurrent: false,
          salary: 'ETB 10,000 / month',
          description: 'Built automated database migration scripts and helped develop internal service APIs.',
        },
      ],
      educations: [
        {
          institution: 'Adama Science and Technology University (ASTU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Computer Science',
          startDate: '2020-09-01',
          endDate: '2024-07-10',
          grade: '3.82 / 4.00 (Very Great Distinction)',
        },
      ],
      skills: ['Node.js', 'PostgreSQL', 'JavaScript', 'TypeScript', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'Afaan Oromo', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 2: Accounting & Finance (Addis Ababa University Graduates) ---
    {
      firstName: 'Meron',
      lastName: 'Tadesse',
      headline: 'Senior Financial Accountant',
      summary: 'ACCA-affiliate senior accountant with 5 years experience in financial reporting, corporate tax compliance, and IFRS implementation across manufacturing and services.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Senior Professional',
      yearsExperience: 5.0,
      availabilityStatus: 'available_with_notice',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'Senior Accountant',
          companyName: 'Abyssinia Trading House',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2022-03-01',
          isCurrent: true,
          salary: 'ETB 42,000 / month',
          description: 'Oversee month-end ledger closing, statutory tax submissions, and annual audit coordination.',
        },
        {
          jobTitle: 'Junior Accountant',
          companyName: 'Zemen Audit Services',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2020-01-10',
          endDate: '2022-02-28',
          isCurrent: false,
          salary: 'ETB 18,000 / month',
          description: 'Handled invoice vouchers, bank reconciliations, and payroll tax deductions.',
        },
      ],
      educations: [
        {
          institution: 'Addis Ababa University (AAU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Accounting and Finance',
          startDate: '2016-09-01',
          endDate: '2019-07-25',
          grade: '3.75 / 4.00',
        },
      ],
      skills: ['Accounting', 'Microsoft Excel', 'Project Management', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
      certifications: [
        { name: 'ACCA Applied Skills Completed', issuer: 'ACCA Global', issuedDate: '2022-11-15' },
      ],
    },
    {
      firstName: 'Dawit',
      lastName: 'Kebede',
      headline: 'Financial Auditor & Tax Specialist',
      summary: 'Accounting graduate from AAU with 4 years experience in internal control reviews, cost audits, and Ethiopian Ministry of Revenue compliance.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Mid-Senior Level',
      yearsExperience: 4.0,
      availabilityStatus: 'immediately_available',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Internal Auditor',
          companyName: 'National Logistics Group',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2021-06-01',
          isCurrent: true,
          salary: 'ETB 34,000 / month',
          description: 'Conduct inventory physical verification, revenue audit, and expenditure reconciliation.',
        },
      ],
      educations: [
        {
          institution: 'Addis Ababa University (AAU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Accounting and Finance',
          startDate: '2017-09-01',
          endDate: '2020-08-15',
          grade: '3.62 / 4.00',
        },
      ],
      skills: ['Accounting', 'Microsoft Excel', 'Project Management'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Bethlehem',
      lastName: 'Getachew',
      headline: 'Junior Accountant (Fresh Graduate)',
      summary: 'High-achieving Accounting and Finance graduate from AAU with solid mastery of debit/credit principles, Peachtree, and Excel modeling.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Entry Level',
      yearsExperience: 0.0,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [],
      educations: [
        {
          institution: 'Addis Ababa University (AAU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Accounting and Finance',
          startDate: '2020-09-01',
          endDate: '2024-07-20',
          grade: '3.88 / 4.00 (Very Great Distinction)',
          description: 'Awarded Dean’s List honors across 6 consecutive academic semesters.',
        },
      ],
      skills: ['Accounting', 'Microsoft Excel', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 3: Mechanical & Industrial Engineering (ASTU Graduates) ---
    {
      firstName: 'Samuel',
      lastName: 'Girma',
      headline: 'Senior Mechanical Maintenance Engineer',
      summary: 'Maintenance engineer with 4 years experience overseeing industrial rolling mills, hydraulic systems, heavy gearboxes, and preventive maintenance routines.',
      city: 'Dukem',
      region: 'Oromia',
      careerLevel: 'Mid-Senior Level',
      yearsExperience: 4.0,
      availabilityStatus: 'available_with_notice',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Mechanical Maintenance Engineer',
          companyName: 'Eastern Metal Works',
          workingCity: 'Dukem',
          employmentType: 'full_time',
          startDate: '2021-04-01',
          isCurrent: true,
          salary: 'ETB 37,000 / month',
          description: 'Reduced factory line downtime by 28% through scheduled preventative component replacement.',
        },
      ],
      educations: [
        {
          institution: 'Adama Science and Technology University (ASTU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Mechanical Engineering',
          startDate: '2016-09-01',
          endDate: '2020-08-10',
          grade: '3.55 / 4.00',
        },
      ],
      skills: ['Project Management', 'Communication', 'Microsoft Excel'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'Afaan Oromo', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Selamawit',
      lastName: 'Desta',
      headline: 'Industrial & Quality Assurance Engineer',
      summary: 'Industrial engineer specializing in plant layout optimization, ISO 9001 quality audits, and lean 5S manufacturing processes. ASTU alumnus.',
      city: 'Adama',
      region: 'Oromia',
      careerLevel: 'Mid Level',
      yearsExperience: 2.5,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'QA/QC Engineer',
          companyName: 'Oromia Agro Industries',
          workingCity: 'Adama',
          employmentType: 'full_time',
          startDate: '2023-01-10',
          isCurrent: true,
          salary: 'ETB 27,000 / month',
          description: 'Establish standard quality control checkpoints on packaging and processing lines.',
        },
      ],
      educations: [
        {
          institution: 'Adama Science and Technology University (ASTU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Industrial Engineering',
          startDate: '2018-09-01',
          endDate: '2022-07-15',
          grade: '3.68 / 4.00',
        },
      ],
      skills: ['Project Management', 'Microsoft Excel', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Henok',
      lastName: 'Berhanu',
      headline: 'Junior Mechanical Maintenance Technician',
      summary: 'Mechanical engineer with 1 year hands-on factory experience in pneumatic pumps, conveyor belts, and technical drafting.',
      city: 'Bishoftu',
      region: 'Oromia',
      careerLevel: 'Junior Level',
      yearsExperience: 1.0,
      availabilityStatus: 'immediately_available',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Junior Maintenance Officer',
          companyName: 'Bishoftu Automotive Works',
          workingCity: 'Bishoftu',
          employmentType: 'full_time',
          startDate: '2024-03-01',
          isCurrent: true,
          salary: 'ETB 19,000 / month',
          description: 'Assist senior engineers during machine overhaul and preventive lubrication schedules.',
        },
      ],
      educations: [
        {
          institution: 'Adama Science and Technology University (ASTU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Mechanical Engineering',
          startDate: '2019-09-01',
          endDate: '2023-07-20',
          grade: '3.42 / 4.00',
        },
      ],
      skills: ['Microsoft Excel', 'Project Management'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 4: Management & Human Resources (Hawassa University Graduates) ---
    {
      firstName: 'Rahel',
      lastName: 'Assefa',
      headline: 'Senior HR Manager',
      summary: 'Seasoned HR practitioner with 6 years experience managing talent recruitment, Ethiopian labor law compliance, and union negotiations.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Senior Professional',
      yearsExperience: 6.0,
      availabilityStatus: 'available_with_notice',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'HR Operations Manager',
          companyName: 'Horizon Hospitality Group',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2021-02-01',
          isCurrent: true,
          salary: 'ETB 48,000 / month',
          description: 'Directed payroll, benefit administration, and employee relation programs for 300+ personnel.',
        },
      ],
      educations: [
        {
          institution: 'Hawassa University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Management & Business Administration',
          startDate: '2014-09-01',
          endDate: '2018-07-10',
          grade: '3.70 / 4.00',
        },
      ],
      skills: ['Human Resources', 'Communication', 'Project Management'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Biruk',
      lastName: 'Tefera',
      headline: 'HR Officer & Recruiter',
      summary: 'HR professional with 1.5 years experience in candidate screening, interview scheduling, and personnel file management. Hawassa University alumnus.',
      city: 'Hawassa',
      region: 'Sidama',
      careerLevel: 'Junior Level',
      yearsExperience: 1.5,
      availabilityStatus: 'immediately_available',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'HR Assistant',
          companyName: 'Hawassa Industrial Park Staffing',
          workingCity: 'Hawassa',
          employmentType: 'full_time',
          startDate: '2023-11-01',
          isCurrent: true,
          salary: 'ETB 20,000 / month',
          description: 'Conducted new employee orientations, biometric registration, and attendance tracking.',
        },
      ],
      educations: [
        {
          institution: 'Hawassa University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Management',
          startDate: '2019-09-01',
          endDate: '2023-07-15',
          grade: '3.52 / 4.00',
        },
      ],
      skills: ['Human Resources', 'Communication', 'Microsoft Excel'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 5: Logistics & Supply Chain (Jimma University Graduates) ---
    {
      firstName: 'Hiwot',
      lastName: 'Mengistu',
      headline: 'Supply Chain Operations Specialist',
      summary: 'Logistics professional with 3.5 years experience managing container freight clearances, warehouse inventory, and transportation fleet dispatching.',
      city: 'Adama',
      region: 'Oromia',
      careerLevel: 'Mid Level',
      yearsExperience: 3.5,
      availabilityStatus: 'available_with_notice',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'Logistics Officer',
          companyName: 'Mojo Dry Port Forwarding',
          workingCity: 'Adama',
          employmentType: 'full_time',
          startDate: '2022-05-01',
          isCurrent: true,
          salary: 'ETB 31,000 / month',
          description: 'Coordinated freight tracking from Djibouti to Mojo and prepared customs clearance documentation.',
        },
      ],
      educations: [
        {
          institution: 'Jimma University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Logistics and Supply Chain Management',
          startDate: '2017-09-01',
          endDate: '2021-07-20',
          grade: '3.60 / 4.00',
        },
      ],
      skills: ['Project Management', 'Microsoft Excel', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'Afaan Oromo', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Natnael',
      lastName: 'Worku',
      headline: 'Warehouse & Inventory Supervisor',
      summary: 'Supply chain graduate from Jimma University with 4 years supervising industrial storage bin locations, goods receipt, and ERP inventory counts.',
      city: 'Dukem',
      region: 'Oromia',
      careerLevel: 'Mid-Senior Level',
      yearsExperience: 4.0,
      availabilityStatus: 'immediately_available',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Warehouse Supervisor',
          companyName: 'Dukem Logistics Hub',
          workingCity: 'Dukem',
          employmentType: 'full_time',
          startDate: '2021-08-01',
          isCurrent: true,
          salary: 'ETB 29,000 / month',
          description: 'Supervised 12 warehouse storekeepers and maintained inventory accuracy rate of 99.4%.',
        },
      ],
      educations: [
        {
          institution: 'Jimma University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Logistics and Supply Chain Management',
          startDate: '2016-09-01',
          endDate: '2020-08-10',
          grade: '3.48 / 4.00',
        },
      ],
      skills: ['Microsoft Excel', 'Project Management', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Eyerusalem',
      lastName: 'Solomon',
      headline: 'Fresh Graduate Logistics Assistant',
      summary: 'Ambitious Jimma University logistics graduate eager to develop expertise in fleet coordination, inventory records, and freight forwarding.',
      city: 'Adama',
      region: 'Oromia',
      careerLevel: 'Entry Level',
      yearsExperience: 0.0,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [],
      educations: [
        {
          institution: 'Jimma University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Logistics and Supply Chain Management',
          startDate: '2020-09-01',
          endDate: '2024-07-15',
          grade: '3.80 / 4.00 (Great Distinction)',
        },
      ],
      skills: ['Microsoft Excel', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'Afaan Oromo', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 6: Electrical & Automation Engineering (Bahir Dar University Graduates) ---
    {
      firstName: 'Ermias',
      lastName: 'Tesfaye',
      headline: 'Electrical Automation Engineer',
      summary: 'Electrical engineer with 3 years experience troubleshooting PLC automation lines, Siemens microcontrollers, industrial switchgear, and motors.',
      city: 'Bahir Dar',
      region: 'Amhara',
      careerLevel: 'Mid Level',
      yearsExperience: 3.0,
      availabilityStatus: 'available_with_notice',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Plant Electrical Engineer',
          companyName: 'Tana Agro Industries',
          workingCity: 'Bahir Dar',
          employmentType: 'full_time',
          startDate: '2022-09-01',
          isCurrent: true,
          salary: 'ETB 33,000 / month',
          description: 'Programmed PLC control logic for automated packaging and monitored factory transformer loads.',
        },
      ],
      educations: [
        {
          institution: 'Bahir Dar University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Electrical and Computer Engineering',
          startDate: '2017-09-01',
          endDate: '2022-07-25',
          grade: '3.65 / 4.00',
        },
      ],
      skills: ['Project Management', 'Microsoft Excel', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Kalkidan',
      lastName: 'Demisse',
      headline: 'Electrical Maintenance Technician',
      summary: 'Bahir Dar University electrical graduate with 1.5 years servicing motor control centers, factory wiring, and backup power generators.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Junior Level',
      yearsExperience: 1.5,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'Junior Electrical Technician',
          companyName: 'Addis Power Equipment',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2023-10-01',
          isCurrent: true,
          salary: 'ETB 21,000 / month',
          description: 'Calibrated industrial sensors and wired low-voltage distribution panels.',
        },
      ],
      educations: [
        {
          institution: 'Bahir Dar University',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Electrical Engineering',
          startDate: '2018-09-01',
          endDate: '2023-07-15',
          grade: '3.50 / 4.00',
        },
      ],
      skills: ['Microsoft Excel', 'Communication'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 7: Marketing & Corporate Sales (Addis Ababa University Graduates) ---
    {
      firstName: 'Surafel',
      lastName: 'Fikre',
      headline: 'Corporate B2B Sales Specialist',
      summary: 'Dynamic sales manager with 4.5 years experience acquiring corporate enterprise accounts, closing tenders, and driving FMCG commercial revenues.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Mid-Senior Level',
      yearsExperience: 4.5,
      availabilityStatus: 'available_with_notice',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Senior Corporate Account Executive',
          companyName: 'Nile Trade & Distributions',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2021-03-01',
          isCurrent: true,
          salary: 'ETB 36,000 / month',
          description: 'Surpassed annual sales quota by 135% through acquiring 18 new institutional corporate accounts.',
        },
      ],
      educations: [
        {
          institution: 'Addis Ababa University (AAU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Marketing Management',
          startDate: '2016-09-01',
          endDate: '2020-07-15',
          grade: '3.58 / 4.00',
        },
      ],
      skills: ['Sales', 'Communication', 'Project Management', 'Microsoft Excel'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
    {
      firstName: 'Mahlet',
      lastName: 'Zewdu',
      headline: 'Digital Marketing & Content Strategist',
      summary: 'Marketing graduate from AAU with 2 years managing digital campaigns, lead acquisition funnels, and brand communications for tech startups.',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      careerLevel: 'Mid Level',
      yearsExperience: 2.0,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'Digital Marketing Lead',
          companyName: 'Fintech Media Ethiopia',
          workingCity: 'Addis Ababa',
          employmentType: 'full_time',
          startDate: '2023-04-01',
          isCurrent: true,
          salary: 'ETB 26,000 / month',
          description: 'Grew organic social media engagement by 200% and ran targeted business lead acquisition funnels.',
        },
      ],
      educations: [
        {
          institution: 'Addis Ababa University (AAU)',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Marketing Management',
          startDate: '2018-09-01',
          endDate: '2022-07-20',
          grade: '3.64 / 4.00',
        },
      ],
      skills: ['Sales', 'Communication', 'Microsoft Excel'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },

    // --- Cluster 8: Health, Safety & Clinical Care (University of Gondar Graduates) ---
    {
      firstName: 'Yared',
      lastName: 'Mekonnen',
      headline: 'Occupational Health & Safety (OHS) Officer',
      summary: 'Environmental health professional with 5 years experience implementing industrial safety regulations, accident investigations, and ISO 45001 audits.',
      city: 'Dukem',
      region: 'Oromia',
      careerLevel: 'Senior Professional',
      yearsExperience: 5.0,
      availabilityStatus: 'available_with_notice',
      gender: 'Male',
      experiences: [
        {
          jobTitle: 'Senior Safety Officer',
          companyName: 'Eastern Industrial Park OHS',
          workingCity: 'Dukem',
          employmentType: 'full_time',
          startDate: '2021-01-15',
          isCurrent: true,
          salary: 'ETB 39,000 / month',
          description: 'Enforced zero-accident safety procedures for 1,200 industrial workers; organized factory emergency drill response routines.',
        },
      ],
      educations: [
        {
          institution: 'University of Gondar',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Environmental Health and Safety',
          startDate: '2015-09-01',
          endDate: '2019-07-15',
          grade: '3.72 / 4.00',
        },
      ],
      skills: ['Project Management', 'Communication', 'Monitoring and Evaluation'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
      certifications: [
        { name: 'NEBOSH International General Certificate in OHS', issuer: 'NEBOSH UK', issuedDate: '2021-08-20' },
      ],
    },
    {
      firstName: 'Senait',
      lastName: 'Gebre',
      headline: 'Industrial Clinical Nurse',
      summary: 'Registered nurse with 3 years clinical experience managing primary emergency triage, first aid, and occupational health screenings in industrial settings. Gondar graduate.',
      city: 'Adama',
      region: 'Oromia',
      careerLevel: 'Mid Level',
      yearsExperience: 3.0,
      availabilityStatus: 'immediately_available',
      gender: 'Female',
      experiences: [
        {
          jobTitle: 'Occupational Health Nurse',
          companyName: 'Adama Factory Clinic',
          workingCity: 'Adama',
          employmentType: 'full_time',
          startDate: '2022-10-01',
          isCurrent: true,
          salary: 'ETB 25,000 / month',
          description: 'Provided acute care and periodic occupational screening for 500+ factory workers.',
        },
      ],
      educations: [
        {
          institution: 'University of Gondar',
          qualification: "Bachelor's Degree",
          fieldOfStudy: 'Clinical Nursing',
          startDate: '2017-09-01',
          endDate: '2021-07-20',
          grade: '3.68 / 4.00',
        },
      ],
      skills: ['Communication', 'Monitoring and Evaluation'],
      languages: [
        { name: 'Amharic', proficiency: 'Native', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
        { name: 'English', proficiency: 'Fluent', reading: 'Fluent', writing: 'Fluent', listening: 'Fluent' },
      ],
    },
  ];

  for (const cData of candidatesData) {
    const slug = slugify(`${cData.firstName}-${cData.lastName}`);
    const email = `${slug}@example.com`;

    // A. Upsert User
    const user = await client.user.upsert({
      where: { email },
      create: {
        email,
        firstName: cData.firstName,
        lastName: cData.lastName,
        passwordHash: await argon2.hash('Candidate123!', { type: argon2.argon2id }),
        accountStatus: 'active',
      },
      update: {
        firstName: cData.firstName,
        lastName: cData.lastName,
        accountStatus: 'active',
      },
    });

    // B. Assign candidate role
    await client.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles.get('candidate')! } },
      create: { userId: user.id, roleId: roles.get('candidate')! },
      update: {},
    });

    // C. Upsert Candidate Profile
    const profile = await client.candidateProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: cData.headline,
        summary: cData.summary,
        gender: cData.gender,
        country: 'Ethiopia',
        region: cData.region,
        city: cData.city,
        address: `${cData.city}, ${cData.region}, Ethiopia`,
        careerLevel: cData.careerLevel,
        yearsExperience: cData.yearsExperience,
        availabilityStatus: cData.availabilityStatus,
        profileVisibility: 'public' as ProfileVisibility,
      },
      update: {
        headline: cData.headline,
        summary: cData.summary,
        gender: cData.gender,
        country: 'Ethiopia',
        region: cData.region,
        city: cData.city,
        address: `${cData.city}, ${cData.region}, Ethiopia`,
        careerLevel: cData.careerLevel,
        yearsExperience: cData.yearsExperience,
        availabilityStatus: cData.availabilityStatus,
        profileVisibility: 'public',
      },
    });

    // D. Re-create Experiences
    await client.candidateExperience.deleteMany({ where: { candidateId: profile.id } });
    for (const exp of cData.experiences) {
      await client.candidateExperience.create({
        data: {
          candidateId: profile.id,
          jobTitle: exp.jobTitle,
          companyName: exp.companyName,
          workingCity: exp.workingCity,
          employmentType: exp.employmentType,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : null,
          isCurrent: exp.isCurrent,
          salary: exp.salary,
          description: exp.description,
        },
      });
    }

    // E. Re-create Educations
    await client.candidateEducation.deleteMany({ where: { candidateId: profile.id } });
    for (const edu of cData.educations) {
      await client.candidateEducation.create({
        data: {
          candidateId: profile.id,
          institution: edu.institution,
          qualification: edu.qualification,
          fieldOfStudy: edu.fieldOfStudy,
          startDate: new Date(edu.startDate),
          endDate: new Date(edu.endDate),
          grade: edu.grade,
          description: edu.description,
        },
      });
    }

    // F. Re-link Skills
    await client.candidateSkill.deleteMany({ where: { candidateId: profile.id } });
    for (const skillName of cData.skills) {
      const skill = await client.skill.upsert({
        where: { name: skillName },
        create: { name: skillName },
        update: {},
      });
      await client.candidateSkill.create({
        data: {
          candidateId: profile.id,
          skillId: skill.id,
        },
      });
    }

    // G. Re-create Languages
    await client.candidateLanguage.deleteMany({ where: { candidateId: profile.id } });
    for (const lang of cData.languages) {
      await client.candidateLanguage.create({
        data: {
          candidateId: profile.id,
          name: lang.name,
          proficiency: lang.proficiency,
          reading: lang.reading,
          writing: lang.writing,
          listening: lang.listening,
        },
      });
    }

    // H. Re-create Certifications
    if (cData.certifications && cData.certifications.length > 0) {
      await client.candidateCertification.deleteMany({ where: { candidateId: profile.id } });
      for (const cert of cData.certifications) {
        await client.candidateCertification.create({
          data: {
            candidateId: profile.id,
            name: cert.name,
            issuer: cert.issuer,
            issuedDate: new Date(cert.issuedDate),
            credentialId: cert.credentialId,
          },
        });
      }
    }

    // I. Generate and Save Real Demo CV PDF
    const cvData: DemoCandidateCvData = {
      name: `${cData.firstName} ${cData.lastName}`,
      title: cData.headline,
      email: email,
      phone: `+251 9${Math.floor(10000000 + Math.random() * 89999999)}`,
      location: `${cData.city}, ${cData.region}, Ethiopia`,
      summary: cData.summary,
      experience: cData.experiences.map((e) => ({
        role: e.jobTitle,
        company: `${e.companyName} (${e.workingCity})`,
        period: `${e.startDate} to ${e.isCurrent ? 'Present' : e.endDate}`,
        desc: e.description,
      })),
      education: cData.educations.map((ed) => ({
        degree: `${ed.qualification} in ${ed.fieldOfStudy}`,
        institution: ed.institution,
        period: `${ed.startDate.slice(0, 4)} - ${ed.endDate.slice(0, 4)}`,
        grade: ed.grade,
      })),
      skills: cData.skills,
    };

    const pdfBuffer = generateDemoPdf(cvData);
    const pdfFilename = `${slug}-resume.pdf`;
    const relativeKey = `cv/demo/${pdfFilename}`;
    const absolutePath = path.resolve(cvDemoDir, pdfFilename);

    await fs.writeFile(absolutePath, pdfBuffer);

    // Create or update File record
    const existingFile = await client.file.findFirst({ where: { storageKey: relativeKey } });
    let fileId: string;
    if (existingFile) {
      await client.file.update({
        where: { id: existingFile.id },
        data: {
          sizeBytes: BigInt(pdfBuffer.length),
          originalFilename: `${cData.firstName}-${cData.lastName}-CV.pdf`,
          mimeType: 'application/pdf',
          fileCategory: FileCategory.cv,
          isPrivate: false,
        },
      });
      fileId = existingFile.id;
    } else {
      const createdFile = await client.file.create({
        data: {
          ownerUserId: user.id,
          storageKey: relativeKey,
          originalFilename: `${cData.firstName}-${cData.lastName}-CV.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: BigInt(pdfBuffer.length),
          fileCategory: FileCategory.cv,
          isPrivate: false,
        },
      });
      fileId = createdFile.id;
    }

    // Link CandidateResume
    await client.candidateResume.deleteMany({ where: { candidateId: profile.id } });
    await client.candidateResume.create({
      data: {
        candidateId: profile.id,
        fileId: fileId,
        title: `${cData.firstName} ${cData.lastName} - Professional CV`,
        isDefault: true,
      },
    });

    console.log(`✓ Seeded candidate: ${cData.firstName} ${cData.lastName} (${email}) with CV: ${relativeKey}`);
  }

  console.log('--- Successfully seeded 22 jobs and 20 candidate accounts with full profiles and CV files! ---');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed-demo-data.ts') || process.argv[1]?.endsWith('seed-demo-data.js')) {
  seedDemoData()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
