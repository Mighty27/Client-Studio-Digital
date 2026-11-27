import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMockDrivePhotos,
  extractDriveFolderId,
  fetchDrivePhotos,
} from './driveParser';

test('extractDriveFolderId parses standard Google Drive folder URLs', () => {
  assert.equal(
    extractDriveFolderId(
      'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing'
    ),
    '1AbCdEfGhIjKlMnOpQrStUvWxYz'
  );
  assert.equal(
    extractDriveFolderId(
      'https://drive.google.com/drive/u/1/folders/1XyZ9876543210AbCdEf'
    ),
    '1XyZ9876543210AbCdEf'
  );
  assert.equal(
    extractDriveFolderId('https://drive.google.com/open?id=1OpenParamFolderId99'),
    '1OpenParamFolderId99'
  );
  assert.equal(
    extractDriveFolderId('https://drive.google.com/folderview?id=1FolderViewId12345'),
    '1FolderViewId12345'
  );
});

test('extractDriveFolderId accepts raw folder IDs and rejects invalid URLs', () => {
  assert.equal(
    extractDriveFolderId('1LuminaWeddingRakaNadira2026'),
    '1LuminaWeddingRakaNadira2026'
  );
  assert.equal(extractDriveFolderId(''), null);
  assert.equal(extractDriveFolderId('https://example.com/not-drive'), null);
  assert.equal(extractDriveFolderId('short'), null);
});

test('buildMockDrivePhotos returns exactly 12 simulation photos', () => {
  const photos = buildMockDrivePhotos('1AbCdEfGhIj');
  assert.equal(photos.length, 12);
  assert.equal(photos[0].source, 'simulation');
  assert.ok(photos[0].name.endsWith('.JPG'));
  assert.ok(photos[0].thumbnailLink.startsWith('/src/assets/images/'));
});

test('fetchDrivePhotos falls back to 12 simulation photos when API key is missing', async () => {
  const res = await fetchDrivePhotos('1AbCdEfGhIjKlMnOp', '');
  assert.equal(res.mode, 'simulation');
  assert.equal(res.photos.length, 12);
});

test('fetchDrivePhotos parses Google Drive v3 API response when API key is provided', async () => {
  const mockFetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        files: [
          {
            id: 'file-1',
            name: 'DSC_0001.JPG',
            mimeType: 'image/jpeg',
            thumbnailLink: 'https://lh3.googleusercontent.com/test=s220',
          },
        ],
      }),
    }) as unknown as Response) as typeof fetch;

  const res = await fetchDrivePhotos('1AbCdEfGhIjKlMnOp', 'test-api-key', mockFetch);
  assert.equal(res.mode, 'google_drive');
  assert.equal(res.photos.length, 1);
  assert.equal(res.photos[0].name, 'DSC_0001.JPG');
  assert.equal(res.photos[0].thumbnailLink, 'https://lh3.googleusercontent.com/test=s800');
  assert.equal(res.photos[0].previewUrl, 'https://lh3.googleusercontent.com/test=s1800');
});
