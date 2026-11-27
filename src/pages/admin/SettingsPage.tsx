import { PageHeader } from '../../components/PageHeader';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export function SettingsPage() {
  const isDriveConfigured = Boolean(
    (import.meta.env.VITE_GOOGLE_DRIVE_API_KEY ?? '').trim()
  );

  return (
    <div>
      <PageHeader
        title="Pengaturan & Integrasi"
        subtitle="Pantau status koneksi backend Supabase, Google Drive API v3, serta informasi operasional studio."
      />

      {/* Integration Status Cards */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <section className="studio-card p-3 p-md-4 h-100" aria-labelledby="supabase-status-title">
            <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
              <div className="d-flex align-items-center gap-3">
                <span
                  className={`icon-badge icon-badge-md ${
                    isSupabaseConfigured ? 'icon-badge-success' : 'icon-badge-warning'
                  }`}
                >
                  <i
                    className={`bi ${
                      isSupabaseConfigured
                        ? 'bi-database-check'
                        : 'bi-database-exclamation'
                    }`}
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <h2 id="supabase-status-title" className="h6 fw-semibold text-light mb-0.5">
                    Supabase Database & Realtime
                  </h2>
                  <div
                    className={`small fw-medium ${
                      isSupabaseConfigured ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {isSupabaseConfigured ? 'Terhubung' : 'Belum Dikonfigurasi'}
                  </div>
                </div>
              </div>
            </div>

            <p className="small text-secondary mb-3">
              Menyimpan data sesi klien, foto terpilih, dan tugas studio secara sinkron di
              cloud. Jika belum dikonfigurasi, sistem otomatis menggunakan{' '}
              <code>localStorage</code> peramban sebagai mode lokal.
            </p>

            <div className="d-flex flex-column gap-2">
              <div className="mono-box d-flex align-items-center justify-content-between gap-2">
                <span>VITE_SUPABASE_URL</span>
                <span className={isSupabaseConfigured ? 'text-success' : 'text-warning'}>
                  {isSupabaseConfigured ? 'Aktif' : 'Kosong'}
                </span>
              </div>
              <div className="mono-box d-flex align-items-center justify-content-between gap-2">
                <span>VITE_SUPABASE_ANON_KEY</span>
                <span className={isSupabaseConfigured ? 'text-success' : 'text-warning'}>
                  {isSupabaseConfigured ? 'Aktif' : 'Kosong'}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="col-12 col-lg-6">
          <section className="studio-card p-3 p-md-4 h-100" aria-labelledby="drive-status-title">
            <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
              <div className="d-flex align-items-center gap-3">
                <span
                  className={`icon-badge icon-badge-md ${
                    isDriveConfigured ? 'icon-badge-success' : 'icon-badge-warning'
                  }`}
                >
                  <i
                    className={`bi ${
                      isDriveConfigured ? 'bi-cloud-check' : 'bi-cloud-slash'
                    }`}
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <h2 id="drive-status-title" className="h6 fw-semibold text-light mb-0.5">
                    Google Drive API v3
                  </h2>
                  <div
                    className={`small fw-medium ${
                      isDriveConfigured ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {isDriveConfigured ? 'Terhubung' : 'Belum Dikonfigurasi'}
                  </div>
                </div>
              </div>
            </div>

            <p className="small text-secondary mb-3">
              Mengambil daftar file gambar (<code>image/jpeg</code>,{' '}
              <code>image/png</code>) langsung dari folder Google Drive publik. Saat kunci
              API belum diisi, galeri otomatis menampilkan 12 foto simulasi studio agar
              alur seleksi tetap dapat diuji.
            </p>

            <div className="mono-box d-flex align-items-center justify-content-between gap-2">
              <span>VITE_GOOGLE_DRIVE_API_KEY</span>
              <span className={isDriveConfigured ? 'text-success' : 'text-warning'}>
                {isDriveConfigured ? 'Aktif' : 'Mode Simulasi'}
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* System Information Panels */}
      <section className="studio-card p-3 p-md-4" aria-labelledby="system-info-title">
        <h2 id="system-info-title" className="h6 fw-semibold text-light mb-3">
          Informasi Sistem & Keamanan Studio
        </h2>

        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="soft-panel h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="icon-badge icon-badge-sm icon-badge-primary">
                  <i className="bi bi-hdd-stack" aria-hidden="true" />
                </span>
                <h3 className="h6 fw-semibold text-light mb-0 fs-6">
                  Mode Lokal vs Cloud
                </h3>
              </div>
              <p className="small text-secondary mb-0">
                Pada mode lokal (<code>localStorage</code>), sesi tersimpan di peramban
                saat ini. Untuk akses lintas perangkat antara Admin dan Klien di luar
                jaringan lokal, aktifkan variabel lingkungan Supabase.
              </p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="soft-panel h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="icon-badge icon-badge-sm icon-badge-success">
                  <i className="bi bi-filetype-sql" aria-hidden="true" />
                </span>
                <h3 className="h6 fw-semibold text-light mb-0 fs-6">
                  Setup Skema SQL
                </h3>
              </div>
              <p className="small text-secondary mb-0">
                Jalankan isi berkas <code className="text-light">supabase_schema.sql</code>{' '}
                di Supabase SQL Editor untuk membuat tabel{' '}
                <code className="text-light">sessions</code>,{' '}
                <code className="text-light">selections</code>,{' '}
                <code className="text-light">tasks</code>,{' '}
                <code className="text-light">schedules</code>, dan{' '}
                <code className="text-light">team_members</code> beserta izin akses
                dan Realtime.
              </p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="soft-panel h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="icon-badge icon-badge-sm icon-badge-warning">
                  <i className="bi bi-shield-lock" aria-hidden="true" />
                </span>
                <h3 className="h6 fw-semibold text-light mb-0 fs-6">
                  Keamanan PIN & Tenggat
                </h3>
              </div>
              <p className="small text-secondary mb-0">
                Setiap galeri dilindungi PIN 4–6 digit yang dicatat di{' '}
                <code>sessionStorage</code> dan terkunci otomatis saat tanggal melewati
                batas masa aktif sesi.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
