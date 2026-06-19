import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    console.log('Seeding blocked in production. Set ALLOW_PROD_SEED=true to override.');
    process.exit(0);
  }

  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  const ownerName = process.env.SEED_OWNER_NAME || 'Business Owner';

  if (!ownerEmail) {
    throw new Error('SEED_OWNER_EMAIL is required for seeding');
  }
  if (!ownerPassword) {
    throw new Error('SEED_OWNER_PASSWORD is required for seeding');
  }

  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existing) { console.log('Seed skipped - user already exists'); return; }

  const hashed = await bcrypt.hash(ownerPassword, 12);

  await prisma.user.create({
    data: {
      email: ownerEmail,
      name: ownerName,
      password: hashed,
      role: 'OWNER',
      active: true,
    },
  });

  await prisma.businessSettings.create({
    data: {
      businessName: 'My Business',
      timezone: 'Asia/Kolkata',
      defaultCurrency: 'INR',
    },
  });

  await prisma.scoringRule.createMany({
    data: [
      { name: 'Phone exists', description: 'Contact has phone number', field: 'contact.phone', operator: 'exists', value: 'true', points: 10 },
      { name: 'Email exists', description: 'Contact has email', field: 'contact.email', operator: 'exists', value: 'true', points: 5 },
      { name: 'Budget exists', description: 'Lead has budget info', field: 'budget', operator: 'exists', value: 'true', points: 15 },
      { name: 'Urgent timeline', description: 'Lead is urgent', field: 'urgency', operator: 'contains', value: 'urgent', points: 20 },
      { name: 'Mentions appointment', description: 'Message contains appointment keyword', field: 'message', operator: 'contains', value: 'appointment', points: 30 },
      { name: 'Mentions pricing', description: 'Message contains pricing keyword', field: 'message', operator: 'contains', value: 'pricing', points: 25 },
      { name: 'Spam or invalid', description: 'Lead marked as spam', field: 'status', operator: 'equals', value: 'SPAM', points: -100 },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
