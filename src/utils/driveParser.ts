import type { DrivePhoto } from '../types/proofing';

interface MockPhotoSeed {
  fileId: string;
  name: string;
  imagePath: string;
  caption: string;
}

const STUDIO_MOCK_SEEDS: MockPhotoSeed[] = [
  {
    fileId: 'mock-4801',
    name: 'IMG_4801.JPG',
    imagePath: '/src/assets/images/studio_wedding_walk_1795758225138.jpg',
    caption: 'Jalan Pagi di Hutan Pinus',
  },
  {
    fileId: 'mock-4804',
    name: 'IMG_4804.JPG',
    imagePath: '/src/assets/images/studio_bridal_portrait_1795758224303.jpg',
    caption: 'Potret Jendela Lengkung',
  },
  {
    fileId: 'mock-4809',
    name: 'IMG_4809.JPG',
    imagePath: '/src/assets/images/studio_rings_detail_1795758224903.jpg',
    caption: 'Detail Cincin Pernikahan',
  },
  {
    fileId: 'mock-4812',
    name: 'IMG_4812.JPG',
    imagePath: '/src/assets/images/studio_groom_prep_1795758225727.jpg',
    caption: 'Persiapan Mempelai Pria',
  },
  {
    fileId: 'mock-4818',
    name: 'IMG_4818.JPG',
    imagePath: '/src/assets/images/studio_ceremony_vows_1795758226800.jpg',
    caption: 'Prosesi Pengucapan Janji',
  },
  {
    fileId: 'mock-4821',
    name: 'IMG_4821.JPG',
    imagePath: '/src/assets/images/studio_veil_silhouette_1795758226430.jpg',
    caption: 'Siluet Senja di Tebing',
  },
  {
    fileId: 'mock-4826',
    name: 'IMG_4826.JPG',
    imagePath: '/src/assets/images/studio_reception_table_1795758226815.jpg',
    caption: 'Dekorasi Meja Makan Malam',
  },
  {
    fileId: 'mock-4830',
    name: 'IMG_4830.JPG',
    imagePath: '/src/assets/images/studio_first_dance_1795758228540.jpg',
    caption: 'Dansa Pertama di Bawah Lampu',
  },
  {
    fileId: 'mock-4834',
    name: 'IMG_4834.JPG',
    imagePath: '/src/assets/images/studio_fashion_editorial_1795758229607.jpg',
    caption: 'Potret Studio Monokrom',
  },
  {
    fileId: 'mock-4838',
    name: 'IMG_4838.JPG',
    imagePath: '/src/assets/images/studio_family_toast_1795758228122.jpg',
    caption: 'Toast Keluarga di Halaman',
  },
  {
    fileId: 'mock-4841',
    name: 'IMG_4841.JPG',
    imagePath: '/src/assets/images/studio_architecture_couple_1795758230142.jpg',
    caption: 'Tangga Batu Travertine',
  },
  {
    fileId: 'mock-4845',
    name: 'IMG_4845.JPG',
    imagePath: '/src/assets/images/studio_bouquet_hands_1795758229565.jpg',
    caption: 'Detail Buket Mawar Putih',
  },
];

/**
 * Extracts Google Drive Folder ID from standard share links or raw folder ID strings.
 * Supported examples:
 * - https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing
 * - https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
 * - https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz
 * - https://drive.google.com/folderview?id=1AbCdEfGhIjKlMnOpQrStUvWxYz
 * - 1AbCdEfGhIjKlMnOpQrStUvWxYz (raw folder ID)
 */
export function extractDriveFolderId(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return null;
  }

  // Raw Drive Folder ID check (min 18 chars with at least one uppercase letter or digit)
  if (/^(?=.*[A-Z0-9])[a-zA-Z0-9_-]{18,128}$/.test(trimmed)) {
    return trimmed;
  }

  // Match /folders/<id>
  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,128})/);
  if (foldersMatch && foldersMatch[1]) {
    return foldersMatch[1];
  }

  // Match ?id=<id> or &id=<id>
  try {
    const parsedUrl = new URL(trimmed);
    if (
      parsedUrl.hostname.includes('drive.google.com') ||
      parsedUrl.hostname.includes('docs.google.com')
    ) {
      const idParam = parsedUrl.searchParams.get('id');
      if (idParam && /^[a-zA-Z0-9_-]{10,128}$/.test(idParam)) {
        return idParam;
      }
    }
  } catch {
    // Fall through to regex query match if partial URL lacks protocol
    const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,128})/);
    if (idQueryMatch && idQueryMatch[1]) {
      return idQueryMatch[1];
    }
  }

  return null;
}

/**
 * Builds deterministic 12 studio sample photos for Fallback / Simulation Mode.
 */
export function buildMockDrivePhotos(folderId = 'demo-studio'): DrivePhoto[] {
  const safePrefix = folderId ? folderId.slice(0, 6) : 'demo';
  return STUDIO_MOCK_SEEDS.map((seed) => ({
    id: `${safePrefix}-${seed.fileId}`,
    name: seed.name,
    mimeType: 'image/jpeg',
    thumbnailLink: seed.imagePath,
    previewUrl: seed.imagePath,
    caption: seed.caption,
    source: 'simulation',
  }));
}

function upgradeDriveThumbnailResolution(thumbnailLink: string, width = 1600): string {
  if (!thumbnailLink) {
    return '';
  }
  if (/=s\d+/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=s\d+/, `=s${width}`);
  }
  return thumbnailLink;
}

export interface DriveFetchResult {
  photos: DrivePhoto[];
  mode: 'google_drive' | 'simulation';
  warning?: string;
}

interface GoogleDriveFilesListResponse {
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Fetches image files (image/jpeg, image/png) from a public Google Drive folder via API v3.
 * Falls back automatically to 12 studio sample photos if VITE_GOOGLE_DRIVE_API_KEY is unset.
 */
export async function fetchDrivePhotos(
  folderId: string,
  explicitApiKey?: string,
  fetcher: typeof fetch = fetch
): Promise<DriveFetchResult> {
  const envKey = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_DRIVE_API_KEY;
  const apiKey = (explicitApiKey ?? envKey ?? '').trim();

  if (!apiKey) {
    return {
      photos: buildMockDrivePhotos(folderId),
      mode: 'simulation',
    };
  }

  if (!folderId) {
    return {
      photos: buildMockDrivePhotos('demo-studio'),
      mode: 'simulation',
      warning: 'Folder ID Google Drive belum valid, menampilkan galeri simulasi.',
    };
  }

  const query = `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png') and trashed=false`;
  const endpoint = new URL('https://www.googleapis.com/drive/v3/files');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('fields', 'files(id,name,mimeType,thumbnailLink)');
  endpoint.searchParams.set('orderBy', 'name');
  endpoint.searchParams.set('pageSize', '200');
  endpoint.searchParams.set('key', apiKey);

  try {
    const response = await fetcher(endpoint.toString());
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as GoogleDriveFilesListResponse;
      const reason = errorBody?.error?.message || `HTTP ${response.status}`;
      return {
        photos: buildMockDrivePhotos(folderId),
        mode: 'simulation',
        warning: `Gagal mengakses Google Drive API (${reason}). Menampilkan mode simulasi sementara.`,
      };
    }

    const data = (await response.json()) as GoogleDriveFilesListResponse;
    const files = data.files ?? [];

    if (files.length === 0) {
      return {
        photos: [],
        mode: 'google_drive',
      };
    }

    const mapped: DrivePhoto[] = files.map((file) => {
      const fallbackThumb = `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w800`;
      const thumb = file.thumbnailLink
        ? upgradeDriveThumbnailResolution(file.thumbnailLink, 800)
        : fallbackThumb;
      const preview = file.thumbnailLink
        ? upgradeDriveThumbnailResolution(file.thumbnailLink, 1800)
        : `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w1800`;

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: thumb,
        previewUrl: preview,
        source: 'google_drive',
      };
    });

    return {
      photos: mapped,
      mode: 'google_drive',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Koneksi terputus';
    return {
      photos: buildMockDrivePhotos(folderId),
      mode: 'simulation',
      warning: `Koneksi Google Drive gagal (${message}). Menampilkan mode simulasi.`,
    };
  }
}
