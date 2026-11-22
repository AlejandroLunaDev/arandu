import type {
  AuthRepository,
  GoogleIdentity,
  UserRow,
} from './auth.repository.js';
import { AuthService } from './auth.service.js';
import type { Caller, SessionsService } from './sessions.service.js';
import type { SupabaseIdentity } from './supabase-identity.js';

const identity: GoogleIdentity = {
  googleSub: 'g-1',
  email: 'a@b.c',
  name: 'Ana',
  avatarUrl: null,
};
const client = { userAgent: 'UA', ip: '1.1.1.1' };
const guest: Caller = { userId: 'guest-1', sessionId: 'sess-g', guest: true };
const member: Caller = { userId: 'user-9', sessionId: 'sess-m', guest: false };
const owner = (over: Partial<UserRow> = {}): UserRow => ({
  id: 'owner-1',
  googleSub: 'g-1',
  email: null,
  name: null,
  avatarUrl: null,
  bannedAt: null,
  ...over,
});

describe('AuthService.signIn', () => {
  const repository = {
    findUserByGoogle: vi.fn(),
    promote: vi.fn(),
    saveGoogleUser: vi.fn(),
    deleteGuest: vi.fn(),
  };
  const sessions = { open: vi.fn(), revoke: vi.fn() };
  const supabase = { verify: vi.fn() };
  let service: AuthService;

  beforeEach(() => {
    for (const fn of [
      ...Object.values(repository),
      ...Object.values(sessions),
      ...Object.values(supabase),
    ])
      fn.mockReset();
    supabase.verify.mockResolvedValue(identity);
    repository.findUserByGoogle.mockResolvedValue(null);
    repository.promote.mockResolvedValue(true);
    repository.saveGoogleUser.mockResolvedValue('saved-1');
    sessions.open.mockResolvedValue({ accessToken: 'pair' });
    service = new AuthService(
      repository as unknown as AuthRepository,
      sessions as unknown as SessionsService,
      supabase as unknown as SupabaseIdentity,
    );
  });

  it('promotes a guest signing in with an unknown Google: same user, old session revoked as switched', async () => {
    await service.signIn('tok', guest, client);

    expect(repository.promote).toHaveBeenCalledWith('guest-1', identity);
    expect(repository.saveGoogleUser).not.toHaveBeenCalled();
    expect(repository.deleteGuest).not.toHaveBeenCalled();
    expect(sessions.revoke).toHaveBeenCalledWith('sess-g', 'switched');
    expect(sessions.open).toHaveBeenCalledWith('guest-1', client);
  });

  it('loads the owner of a known Google for a guest and deletes the guest without revoking separately', async () => {
    repository.findUserByGoogle.mockResolvedValue(owner());

    await service.signIn('tok', guest, client);

    expect(repository.promote).not.toHaveBeenCalled();
    expect(repository.saveGoogleUser).toHaveBeenCalledWith(identity);
    expect(repository.deleteGuest).toHaveBeenCalledWith('guest-1');
    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(sessions.open).toHaveBeenCalledWith('saved-1', client);
  });

  it('falls back to the Google user and deletes the guest when the promotion loses (no longer a guest)', async () => {
    repository.promote.mockResolvedValue(false);

    await service.signIn('tok', guest, client);

    expect(repository.saveGoogleUser).toHaveBeenCalledWith(identity);
    expect(repository.deleteGuest).toHaveBeenCalledWith('guest-1');
  });

  it('deletes the guest by id when a parallel sign-in already promoted it: the SQL guard keeps a promoted account safe', async () => {
    repository.promote.mockResolvedValue(false);
    repository.saveGoogleUser.mockResolvedValue('other-1');

    await service.signIn('tok', guest, client);

    expect(repository.deleteGuest).toHaveBeenCalledWith('guest-1');
    expect(sessions.open).toHaveBeenCalledWith('other-1', client);
  });

  it('signs a signed-in user into another Google: saves it and revokes the current session', async () => {
    await service.signIn('tok', member, client);

    expect(repository.promote).not.toHaveBeenCalled();
    expect(repository.saveGoogleUser).toHaveBeenCalledWith(identity);
    expect(repository.deleteGuest).not.toHaveBeenCalled();
    expect(sessions.revoke).toHaveBeenCalledWith('sess-m', 'switched');
    expect(sessions.open).toHaveBeenCalledWith('saved-1', client);
  });

  it('without a current session just saves the Google user and opens a session', async () => {
    await service.signIn('tok', null, client);

    expect(repository.saveGoogleUser).toHaveBeenCalledWith(identity);
    expect(repository.deleteGuest).not.toHaveBeenCalled();
    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(sessions.open).toHaveBeenCalledWith('saved-1', client);
  });

  it('answers 403 user_banned for a banned owner, changing nothing', async () => {
    repository.findUserByGoogle.mockResolvedValue(
      owner({ bannedAt: new Date() }),
    );

    await expect(service.signIn('tok', guest, client)).rejects.toMatchObject({
      status: 403,
      response: { code: 'user_banned' },
    });
    expect(repository.deleteGuest).not.toHaveBeenCalled();
    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('answers 401 invalid_identity_token when Supabase does not vouch for the token', async () => {
    supabase.verify.mockResolvedValue(null);

    await expect(service.signIn('bad', guest, client)).rejects.toMatchObject({
      status: 401,
      response: { code: 'invalid_identity_token' },
    });
    expect(repository.findUserByGoogle).not.toHaveBeenCalled();
    expect(sessions.open).not.toHaveBeenCalled();
  });
});
