# Catatan perubahan

## Revisi terbaru

### Guess Message dirombak
- **Enam soal pilihan** (sebelumnya hanya satu): Caesar, Rail Fence, Scytale, Vigenère, Playfair, dan Hill 2×2, dari mudah sampai sulit. Soal lama (`KOPI PANTRY HILANG LAGI`, Rail Fence 3 rail) tetap ada sebagai Soal 2. `guess.js`, `guess.html`, `style.css`.
- **Waktu dan poin per soal**: 60 / 90 / 90 / 120 / 150 / 180 detik, 10–30 poin sesuai tingkat. Ciphertext, parameter metode (kunci, kisi, matriks), dan hitung mundur baru muncul bersamaan saat Mulai Ronde.
- **Pilihan kelompok tetap ada, tapi jadi papan skor**: tidak ada lagi kelompok bawaan (dulu Kelompok A terpilih otomatis sehingga poin bisa salah masuk). Host menekan tombol Kelompok A atau B saat mengirim tebakan; Enter saja tidak menetapkan kelompok. Skor A/B dihitung dan bertahan saat halaman dimuat ulang (`sessionStorage`), ada tombol Reset skor.
- Soal yang dipecahkan terkunci; soal yang waktunya habis boleh dicoba lagi. Ronde bisa dibatalkan tanpa mengubah skor.
- Pilihan kelompok tidak lagi aktif setelah ronde selesai (sebelumnya radio tetap bisa diubah saat input sudah terkunci).

### Perbaikan bug
- **Halaman Metode membocorkan jawaban cerita**: isi awal dan teks penjelasan memuat jawaban/kunci asli (`KEPANTRYDULU`, `LEMBARKETIGADIRUANGBACA`, kunci `MODUS` dan `MEDIAN`, `ABSENX`, geser 4, 6 rail, dan sebagainya), jadi pemain tinggal membuka Pelajari Metode untuk melihat ciphertext dan kuncinya. Semua contoh diganti dengan teks netral (mis. `TUGAS KAMPUS` geser 3, kunci `LOGIN`, kunci `KAMPUS`). Fungsi hitungnya tidak berubah. `metode.html`.
- **Cerita: jawaban yang sedang diketik hilang** saat membuka petunjuk atau Lab karena halaman dirender ulang. Kini teks jawaban dipertahankan; dikosongkan hanya saat tiga nyawa habis. `game.js`.
- Salah ketik `UCOk` pada contoh pesan kunci. `metode.html`.

## Perubahan sebelumnya

### Perbaikan bug
- **Nyawa**: angka Nyawa di panel atas kini langsung turun saat jawaban salah. `game.js`.
- **Denah**: "Tujuan berikutnya" tampil `???` sampai jawaban benar. `game.js`.
- **Layar ending**: tata letak diperbaiki; jam di ending menunjukkan 07.00. `style.css`.
- **Guess Message**: ciphertext baru muncul setelah Mulai Ronde. `guess.js`, `guess.html`.
- **Lab**: tetap terbuka saat hint dibuka atau objek diklik. `game.js`.
- **Navigasi**: label disamakan di semua halaman dengan penanda halaman aktif.

### Fitur
- `audio.js`: suara misteri tanpa file audio (default mati, tombol Suara di menu).
- Kilatan layar singkat saat jumpscare di studio (dilewati pada reduced motion) dan jam 02.14 yang berkedip pelan.

## Tidak diubah
Semua soal, kunci, dan ciphertext cerita (diverifikasi ulang dengan `cipher.js`): `OI TERXVC HYPY`, `LGAEI ABCMT DGABE INAKR ARU`, `OSUGA ZHRCD QHEYJ NWVCC`, `TUSAF TRIAH IUTLD PRBYF PG`, Pigpen `KEMBALIKEKELASTUJUHSEBELASA`, `DFOEEL`.
