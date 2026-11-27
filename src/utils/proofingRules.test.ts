import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClientShareUrl,
  calculateQuotaProgress,
  canTogglePhotoSelection,
  formatSelectionFilenames,
  isQuotaReached,
  isSessionExpired,
  validatePinFormat,
  validateSessionInput,
} from './proofingRules';

test('isSessionExpired locks only after deadline date has passed', () => {
  assert.equal(isSessionExpired('2026-11-25', '2026-11-26'), true);
  assert.equal(isSessionExpired('2026-11-26', '2026-11-26'), false);
  assert.equal(isSessionExpired('2026-12-10', '2026-11-26'), false);
});

test('hard quota lock prevents selecting beyond max_quota while allowing deselection', () => {
  assert.equal(isQuotaReached(5, 5), true);
  assert.equal(isQuotaReached(4, 5), false);

  // At quota: cannot select unselected photo
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

  // At quota: CAN deselect already selected photo
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

  // Submitted or expired: locked even for selected photos
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

test('validatePinFormat requires 4 to 6 numeric digits', () => {
  assert.equal(validatePinFormat('1234'), true);
  assert.equal(validatePinFormat('123456'), true);
  assert.equal(validatePinFormat('123'), false);
  assert.equal(validatePinFormat('1234567'), false);
  assert.equal(validatePinFormat('12ab'), false);
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
