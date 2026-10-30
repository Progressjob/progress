import { Prisma } from '@prisma/client';

type Event = {
  title: string;
  message: string;
  type: string;
  referenceType: string;
  referenceId: string;
};
export async function notifyReviewers(
  tx: Prisma.TransactionClient,
  event: Event,
) {
  const users = await tx.user.findMany({
    where: {
      accountStatus: 'active',
      roles: { some: { role: { name: { in: ['admin', 'moderator'] } } } },
    },
    select: { id: true },
  });
  if (users.length)
    await tx.notification.createMany({
      data: users.map(({ id }) => ({ ...event, userId: id })),
    });
}
export async function notifyCompanyMembers(
  tx: Prisma.TransactionClient,
  companyId: string,
  event: Event,
) {
  const members = await tx.companyMember.findMany({
    where: { companyId, status: 'active' },
    select: { userId: true },
  });
  if (members.length)
    await tx.notification.createMany({
      data: members.map(({ userId }) => ({ ...event, userId })),
    });
}
