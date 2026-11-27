import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProofingSession, StudioSchedule } from '../types/proofing';
import { hashPassword, verifyPassword } from './passwordCrypto';
import {
  buildClientShareUrl,
  buildMonthCalendarGrid,
  calculateQuotaProgress,
  canDeleteTeamMember,
  canEditTeamMember,
  canManageTeam,
  canTogglePhotoSelection,
  daysUntilDate,
  findScheduleConflicts,
  formatSelectionFilenames,
  getAssignableRolesForActor,
  getInitials,
  getUpcomingDeadlines,
  getUpcomingSchedules,
  isExpiringSoon,
  isQuotaReached,
  isSessionExpired,
  isTaskOverdue,
  validatePasswordChangeInput,
  validatePinFormat,
  validateProfileInput,
  validateRegisterInput,
  validateScheduleInput,
  validateSessionInput,
  validateTaskInput,
  validateTeamMemberInput,
} from './proofingRules';

test('isSessionExpired locks only after deadline date has passed', () => {
  assert.equal(isSessionExpired('2026-11-25', '2026-11-26'), true);
  assert.equal(isSessionExpired('2026-11-26', '2026-11-26'), false);
  assert.equal(isSessionExpired('2026-12-10', '2026-11-26'), false);
});

test('daysUntilDate and isExpiringSoon evaluate 7-day window accurately', () => {
  assert.equal(daysUntilDate('2026-11-26', '2026-11-26'), 0);
  assert.equal(daysUntilDate('2026-12-03', '2026-11-26'), 7);
  assert.equal(daysUntilDate('2026-11-24', '2026-11-26'), -2);

  assert.equal(isExpiringSoon('2026-12-03', 'active', '2026-11-26'), true);
  assert.equal(isExpiringSoon('2026-12-04', 'active', '2026-11-26'), false);
  assert.equal(isExpiringSoon('2026-11-24', 'active', '2026-11-26'), false);
  assert.equal(isExpiringSoon('2026-11-28', 'submitted', '2026-11-26'), false);
});

test('getUpcomingDeadlines returns sorted active sessions limited to 5', () => {
  const makeSession = (
    id: string,
    expires_at: string,
    status: ProofingSession['status'] = 'active'
  ): ProofingSession => ({
    id,
    client_name: id,
    drive_folder_url: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQr',
    drive_folder_id: '1AbCdEfGhIjKlMnOpQr',
    max_quota: 10,
    pin_code: '1234',
    expires_at,
    status,
    created_at: '2026-11-01T00:00:00Z',
  });

  const list = getUpcomingDeadlines([
    makeSession('s3', '2026-12-15'),
    makeSession('s_sub', '2026-11-27', 'submitted'),
    makeSession('s1', '2026-11-28'),
    makeSession('s2', '2026-12-02'),
  ]);

  assert.deepEqual(
    list.map((s) => s.id),
    ['s1', 's2', 's3']
  );
});

test('isTaskOverdue flags incomplete tasks past due_date', () => {
  assert.equal(isTaskOverdue({ due_date: '2026-11-25', status: 'todo' }, '2026-11-26'), true);
  assert.equal(
    isTaskOverdue({ due_date: '2026-11-25', status: 'in_progress' }, '2026-11-26'),
    true
  );
  assert.equal(isTaskOverdue({ due_date: '2026-11-25', status: 'done' }, '2026-11-26'), false);
  assert.equal(isTaskOverdue({ due_date: '2026-11-26', status: 'todo' }, '2026-11-26'), false);
  assert.equal(isTaskOverdue({ due_date: null, status: 'todo' }, '2026-11-26'), false);
});

test('hard quota lock prevents selecting beyond max_quota while allowing deselection', () => {
  assert.equal(isQuotaReached(5, 5), true);
  assert.equal(isQuotaReached(4, 5), false);

  assert.equal(
    canTogglePhotoSelection({
      selectedCount: 5,
      maxQuota: 5,
      isCurrentlySelected: false,
      status: 'active',
      isExpired: false,
    }),
    false
  );

  assert.equal(
    canTogglePhotoSelection({
      selectedCount: 5,
      maxQuota: 5,
      isCurrentlySelected: true,
      status: 'active',
      isExpired: false,
    }),
    true
  );

  assert.equal(
    canTogglePhotoSelection({
      selectedCount: 2,
      maxQuota: 5,
      isCurrentlySelected: true,
      status: 'submitted',
      isExpired: false,
    }),
    false
  );
  assert.equal(
    canTogglePhotoSelection({
      selectedCount: 2,
      maxQuota: 5,
      isCurrentlySelected: false,
      status: 'active',
      isExpired: true,
    }),
    false
  );
});

test('formatSelectionFilenames supports comma, space, and newline formats', () => {
  const items = [{ file_name: 'IMG_4801.JPG' }, { file_name: 'IMG_4804.JPG' }];
  assert.equal(formatSelectionFilenames(items, 'comma'), 'IMG_4801.JPG, IMG_4804.JPG');
  assert.equal(formatSelectionFilenames(items, 'space'), 'IMG_4801.JPG IMG_4804.JPG');
  assert.equal(formatSelectionFilenames(items, 'newline'), 'IMG_4801.JPG\nIMG_4804.JPG');
  assert.equal(formatSelectionFilenames([], 'comma'), '');
});

test('validatePinFormat and validateTaskInput enforce required formats', () => {
  assert.equal(validatePinFormat('1234'), true);
  assert.equal(validatePinFormat('123456'), true);
  assert.equal(validatePinFormat('123'), false);
  assert.equal(validatePinFormat('12ab'), false);

  assert.equal(
    validateTaskInput({
      title: 'Color grading 30 foto',
      notes: '',
      session_id: null,
      due_date: '2026-12-01',
    }).valid,
    true
  );
  assert.equal(
    validateTaskInput({
      title: ' ',
      notes: '',
      session_id: null,
      due_date: null,
    }).valid,
    false
  );
});

test('validateSessionInput validates required fields and extracts folder ID', () => {
  const validResult = validateSessionInput({
    client_name: 'Raka & Nadira',
    drive_folder_url: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrSt',
    max_quota: 50,
    pin_code: '4820',
    expires_at: '2026-12-30',
    status: 'active',
  });
  assert.equal(validResult.valid, true);
  assert.equal(validResult.folderId, '1AbCdEfGhIjKlMnOpQrSt');

  const invalidResult = validateSessionInput({
    client_name: '',
    drive_folder_url: 'not-a-drive-link',
    max_quota: 0,
    pin_code: '12',
    expires_at: '',
    status: 'active',
  });
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.client_name);
  assert.ok(invalidResult.errors.drive_folder_url);
  assert.ok(invalidResult.errors.max_quota);
  assert.ok(invalidResult.errors.pin_code);
  assert.ok(invalidResult.errors.expires_at);
});

test('calculateQuotaProgress and buildClientShareUrl compute expected outputs', () => {
  assert.equal(calculateQuotaProgress(3, 5), 60);
  assert.equal(calculateQuotaProgress(8, 5), 100);
  assert.equal(
    buildClientShareUrl('https://luminaproof.netlify.app/', 'ses-123'),
    'https://luminaproof.netlify.app/?session=ses-123'
  );
});

test('validateScheduleInput validates required fields and time ordering', () => {
  const valid = validateScheduleInput({
    title: 'Resepsi Dito & Clara',
    client_name: 'Dito & Clara',
    event_type: 'wedding',
    shoot_date: '2026-12-12',
    start_time: '09:00',
    end_time: '14:00',
    location: 'Hotel Mulia',
    photographer: 'Rafi',
    session_id: null,
    status: 'scheduled',
    notes: '',
  });
  assert.equal(valid.valid, true);

  const invalid = validateScheduleInput({
    title: 'A',
    client_name: '',
    event_type: 'wedding',
    shoot_date: '',
    start_time: '14:00',
    end_time: '12:00',
    location: '',
    photographer: '',
    session_id: null,
    status: 'scheduled',
    notes: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.client_name);
  assert.ok(invalid.errors.shoot_date);
  assert.ok(invalid.errors.end_time);
});

test('findScheduleConflicts detects overlapping active shoots and ignores cancelled or self', () => {
  const makeSchedule = (
    id: string,
    shoot_date: string,
    start_time: string,
    end_time: string,
    status: StudioSchedule['status'] = 'scheduled'
  ): StudioSchedule => ({
    id,
    title: id,
    client_name: 'Client',
    event_type: 'portrait',
    shoot_date,
    start_time,
    end_time,
    location: 'Studio 1',
    photographer: 'Tim A',
    session_id: null,
    status,
    notes: '',
    created_at: '2026-11-01T00:00:00Z',
  });

  const existing = [
    makeSchedule('ev1', '2026-12-10', '09:00', '12:00', 'scheduled'),
    makeSchedule('ev2', '2026-12-10', '13:00', '15:00', 'cancelled'),
  ];

  // Overlaps ev1
  assert.equal(
    findScheduleConflicts(
      { shoot_date: '2026-12-10', start_time: '11:00', end_time: '13:30' },
      existing
    ).length,
    1
  );
  // Touching boundary (12:00..14:00) does not overlap 09:00..12:00, and ev2 is cancelled
  assert.equal(
    findScheduleConflicts(
      { shoot_date: '2026-12-10', start_time: '12:00', end_time: '14:00' },
      existing
    ).length,
    0
  );
  // Self edit excluded
  assert.equal(
    findScheduleConflicts(
      { id: 'ev1', shoot_date: '2026-12-10', start_time: '09:30', end_time: '11:30' },
      existing
    ).length,
    0
  );
});

test('getUpcomingSchedules and buildMonthCalendarGrid compute chronological shoots and Monday-first grid', () => {
  const makeSchedule = (
    id: string,
    shoot_date: string,
    start_time: string,
    status: StudioSchedule['status'] = 'scheduled'
  ): StudioSchedule => ({
    id,
    title: id,
    client_name: 'Client',
    event_type: 'event',
    shoot_date,
    start_time,
    end_time: '18:00',
    location: '',
    photographer: '',
    session_id: null,
    status,
    notes: '',
    created_at: '2026-11-01T00:00:00Z',
  });

  const upcoming = getUpcomingSchedules(
    [
      makeSchedule('past', '2026-11-25', '09:00'),
      makeSchedule('done', '2026-11-28', '08:00', 'completed'),
      makeSchedule('b', '2026-11-29', '13:00'),
      makeSchedule('a', '2026-11-29', '09:00'),
    ],
    '2026-11-27',
    5
  );
  assert.deepEqual(
    upcoming.map((s) => s.id),
    ['a', 'b']
  );

  // November 2026 starts on Sunday (offset 6 in Mon-first grid) and has 30 days -> 42 cells (6 weeks)
  const grid = buildMonthCalendarGrid(2026, 10);
  assert.equal(grid.length % 7, 0);
  assert.equal(grid.filter((c) => c.inCurrentMonth).length, 30);
  assert.equal(grid[6]?.isoDate, '2026-11-01');
});

test('hashPassword and verifyPassword securely hash and verify passwords', async () => {
  const hash1 = await hashPassword('StudioRahasia2026!');
  const hash2 = await hashPassword('StudioRahasia2026!');

  assert.ok(hash1.startsWith('pbkdf2$'));
  assert.notEqual(hash1, hash2); // unique random salt per hash
  assert.equal(await verifyPassword('StudioRahasia2026!', hash1), true);
  assert.equal(await verifyPassword('SalahPassword', hash1), false);
  assert.equal(await verifyPassword('StudioRahasia2026!', 'invalid-hash'), false);
});

test('RBAC permissions separate owner, admin, and read-only member access', () => {
  assert.equal(canManageTeam('owner'), true);
  assert.equal(canManageTeam('admin'), true);
  assert.equal(canManageTeam('member'), false);

  assert.deepEqual(getAssignableRolesForActor('owner'), ['owner', 'admin', 'member']);
  assert.deepEqual(getAssignableRolesForActor('admin'), ['admin', 'member']);
  assert.deepEqual(getAssignableRolesForActor('member'), []);

  const owner = { id: 'u-owner', role: 'owner' as const };
  const admin = { id: 'u-admin', role: 'admin' as const };
  const member = { id: 'u-member', role: 'member' as const };

  // Owner can edit/delete admin and member, cannot delete self
  assert.equal(canEditTeamMember(owner, admin), true);
  assert.equal(canDeleteTeamMember(owner, admin), true);
  assert.equal(canDeleteTeamMember(owner, owner), false);

  // Admin can edit/delete member, cannot edit/delete owner, cannot delete self
  assert.equal(canEditTeamMember(admin, member), true);
  assert.equal(canDeleteTeamMember(admin, member), true);
  assert.equal(canEditTeamMember(admin, owner), false);
  assert.equal(canDeleteTeamMember(admin, owner), false);
  assert.equal(canDeleteTeamMember(admin, admin), false);

  // Member cannot edit/delete anyone
  assert.equal(canEditTeamMember(member, member), false);
  assert.equal(canDeleteTeamMember(member, member), false);
});

test('team, registration, profile, and password change validators work accurately', () => {
  assert.equal(getInitials('Rafi Pratama'), 'RP');
  assert.equal(getInitials('Lumina'), 'LU');

  assert.equal(
    validateTeamMemberInput(
      {
        full_name: 'Nadia Putri',
        email: 'nadia@lumina.studio',
        role: 'member',
        job_title: 'Editor',
        phone: '',
        bio: '',
        is_active: true,
        password: 'password123',
      },
      true
    ).valid,
    true
  );

  assert.equal(
    validateTeamMemberInput(
      {
        full_name: 'N',
        email: 'bad-email',
        role: 'member',
        job_title: '',
        phone: '',
        bio: '',
        is_active: true,
        password: '123',
      },
      true
    ).valid,
    false
  );

  assert.equal(
    validateRegisterInput({
      full_name: 'Bima',
      email: 'bima@studio.id',
      job_title: 'Photographer',
      phone: '0812',
      password: 'secret123',
      confirm_password: 'secret123',
    }).valid,
    true
  );

  assert.equal(
    validateProfileInput({ full_name: 'Bima', email: 'invalid', job_title: '', phone: '', bio: '' })
      .valid,
    false
  );

  assert.equal(
    validatePasswordChangeInput({
      currentPassword: 'old',
      newPassword: 'newpassword',
      confirmPassword: 'mismatch',
    }).valid,
    false
  );
});
