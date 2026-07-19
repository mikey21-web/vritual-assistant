import { ChannelPartnersService } from './channel-partners.service';

describe('ChannelPartnersService onboarding/expiry', () => {
  const prisma = {
    channelPartner: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  } as any;
  const service = new ChannelPartnersService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('markTrainingComplete sets trainingCompletedAt and activates onboarding', async () => {
    prisma.channelPartner.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.channelPartner.update.mockResolvedValue({ id: 'p1', onboardingStatus: 'ACTIVE' });
    await service.markTrainingComplete('p1');
    expect(prisma.channelPartner.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { trainingCompletedAt: expect.any(Date), onboardingStatus: 'ACTIVE' },
    });
  });

  it('expiryAlerts flags only the fields actually within the window', async () => {
    const soon = new Date(Date.now() + 5 * 86400000);
    const far = new Date(Date.now() + 90 * 86400000);
    prisma.channelPartner.findMany.mockResolvedValue([
      { id: 'p1', name: 'A', reraId: 'R1', reraExpiryAt: soon, agreementExpiryAt: far },
    ]);
    const result = await service.expiryAlerts('t1', 30);
    expect(result[0].reraExpiring).toBe(true);
    expect(result[0].agreementExpiring).toBe(false);
  });
});
