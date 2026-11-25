# Kuis Hantu Pukul 02.14

Game escape room edukasi kriptografi untuk presentasi kelas. Bantu Ucok memecahkan enam pesan dan keluar dari Gedung Nano sebelum pagi.

## Menjalankan

Tidak perlu instalasi, server, build, atau koneksi internet. Buka `index.html` di browser modern. Empat halaman memakai tautan relatif dan dapat dijalankan dari folder lokal.

## Halaman

| Berkas | Isi |
| --- | --- |
| [`index.html`](index.html) | Premis cerita, lanjutkan progres, buka pelajaran, atau langsung mulai Guess Message. |
| [`metode.html`](metode.html) | Simulasi Caesar, Scytale, Vigenère, Pigpen, steganografi teks, Rail Fence, Playfair, Hill, hash, kunci simetris/asimetris, dan alur rotor Enigma. |
| [`game.html`](game.html) | Cerita enam tahap dengan tiga nyawa, hint berbiaya skor, Lab cipher, lima sobekan absen, dan penutup. |
| [`guess.html`](guess.html) | Enam soal sandi dengan waktu dan poin berbeda untuk dua kelompok. Pilih soal, host mengetik tebakan lisan, papan skor A/B berjalan. |

## Aturan permainan

Cerita bergerak melalui enam teka-teki: Caesar dengan geser 4, Rail Fence 6 rail, Vigenère dengan kunci `MODUS`, Playfair dengan kunci `MEDIAN`, Pigpen, lalu Hill 2×2. Jawaban tiap tahap membuka ruangan berikutnya. Setelah memecahkan Hill, tanda tangani absen untuk membuka lift.

Pemain memulai dengan tiga nyawa dan skor 100. Jawaban salah mengurangi satu nyawa; nyawa habis mengulang tahap aktif tanpa menghapus hint atau skor. Hint dibuka berurutan dengan biaya 5, 10, lalu 20 poin. Timer cerita hanya mencatat waktu berjalan dan tidak mengakhiri permainan.

Guess Message punya enam soal yang terpisah dari cerita: Caesar (60 dtk, 10 poin), Rail Fence (90 dtk, 10), Scytale (90 dtk, 20), Vigenère (120 dtk, 20), Playfair (150 dtk, 30), dan Hill 2×2 (180 dtk, 30). Kelompok bebas memilih soal; ciphertext, parameter metode, dan hitung mundur baru muncul setelah Mulai Ronde. Host mengetik tebakan lalu menekan tombol Kelompok A atau B (tidak ada kelompok bawaan, jadi poin tidak salah masuk). Jawaban benar menambah poin kelompok itu dan mengunci soal; waktu habis mengungkap jawaban dan soal boleh dicoba lagi. Skor disimpan di `sessionStorage` (hilang saat tab ditutup; tombol Reset skor tersedia) dan tidak menyentuh progres cerita.

## Suara

Suara **mati secara default**. Nyalakan lewat tombol **Suara** di menu atas (butuh satu klik karena browser memblokir suara otomatis). Pilihan disimpan di `localStorage` dengan kunci `kuis-hantu-sound-v1`. Isinya dengung rendah dan angin tipis yang berubah nada tiap tahap, bunyi kertas, pintu, jawaban benar/salah, jumpscare ringan di studio, serta detik hitung mundur di Guess Message. Semua dibangkitkan dari kode, jadi tetap jalan offline. Suara berhenti saat tab disembunyikan dan di layar ending.

## Progres dan privasi

Cerita menyimpan tahap, nyawa, skor, hint, potongan absen, dan waktu di `localStorage` browser dengan kunci `kuis-hantu-story-v1`. Progres hanya tersedia pada browser/perangkat yang sama. Bila penyimpanan browser gagal, game tetap dapat dimainkan dalam memori, tetapi progres tidak bertahan setelah halaman ditutup. Situs tidak memiliki akun, backend, atau pengiriman data ke server.

Teks sandi dan kunci berada di kode sisi browser. Cipher klasik pada game adalah bahan belajar, bukan perlindungan untuk pesan rahasia. Aktivitas bcrypt, MD5, dan Argon2 hanya simulasi konsep, bukan hasil hash asli; MD5 tidak aman untuk password.

## Struktur proyek

- `cipher.js`: algoritma cipher yang dipakai game dan pelajaran.
- `audio.js`: efek suara dan ambience misteri yang dibangkitkan Web Audio API (tanpa file audio).
- `landing.js`, `metode.js`, `game.js`, `guess.js`: interaksi tiap halaman. Daftar soal Guess ada di bagian atas `guess.js` (`questions`); ciphertext dihitung dari teks asli lewat `cipher.js`.
- `style.css`: tampilan pixel-art retro yang responsif.
- `PRD_Kuis_Hantu_Pukul_0214.md`: kebutuhan produk dan kriteria penerimaan.

Untuk memeriksa sintaks JavaScript jika Node.js tersedia:

```sh
node --check cipher.js
node --check landing.js
node --check metode.js
node --check game.js
node --check guess.js
```

## Catatan tugas

Materi tugas menyebut satu halaman website, sedangkan produk ini memakai empat halaman terpisah. Konfirmasikan pilihan multi-page kepada pengampu sebelum penilaian.

## Catatan perubahan

Lihat [`PERUBAHAN.md`](PERUBAHAN.md).
