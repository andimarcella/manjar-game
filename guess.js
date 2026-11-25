(() => {
  "use strict";

  const C = window.KuisCipher;
  const $ = selector => document.querySelector(selector);
  const picker = $("#picker");
  const list = $("#question-list");
  const round = $("#round");
  const roundTitle = $("#round-title");
  const roundMeta = $("#round-meta");
  const cipherBox = $("#cipher");
  const roundInfo = $("#round-info");
  const timer = $("#timer");
  const form = $("#guess-form");
  const input = $("#guess-input");
  const teamButtons = [...document.querySelectorAll("[data-team]")];
  const startButton = $("#start-button");
  const backButton = $("#back-button");
  const resetButton = $("#reset-button");
  const status = $("#form-status");
  const turnBox = $("#turn");
  const learnLink = $("#learn-link");
  const scoreBox = { A: $("#score-a strong"), B: $("#score-b strong") };

  if (!C || !list) {
    const message = document.querySelector(".guess-panel");
    if (message) message.append("Guess Message tidak dapat dimulai. Pastikan cipher.js ada di folder yang sama.");
    return;
  }

  const STORAGE_KEY = "kuis-hantu-guess-v1";
  const PLACEHOLDER = "Pesan tersandi muncul saat ronde dimulai.";
  const sfx = name => { try { if (window.KuisAudio) window.KuisAudio.play(name); } catch (_) { /* suara opsional */ } };

  const hillKey = [[2, 3], [1, 4]];
  const hillInverse = [[6, 15], [5, 16]];

  // Waktu dihitung dari kerja manual: baca aturan, susun ulang, lalu ketik jawaban.
  const questions = [
    {
      id: "caesar", method: "Caesar", level: "Mudah", seconds: 60, points: 10, learn: "caesar",
      text: "LAMPU LIFT MATI", encode: p => C.caesar(p, 3),
      info: () => "Caesar, geser 3. Mundurkan setiap huruf 3 posisi dalam alfabet."
    },
    {
      id: "rail", method: "Rail Fence", level: "Mudah", seconds: 90, points: 10, learn: "rail-fence",
      text: "KOPI PANTRY HILANG LAGI", encode: p => C.rail(p, 3),
      info: () => "Rail Fence, 3 rail. Letakkan kembali huruf pada pola zigzag 3 baris, lalu baca ke kanan."
    },
    {
      id: "scytale", method: "Scytale", level: "Sedang", seconds: 90, points: 20, learn: "scytale",
      text: "KUNCI DI BAWAH MEJA", encode: p => C.scytale(p, 4),
      info: () => "Scytale, 4 kolom. Isi ciphertext per kolom dari atas ke bawah, lalu baca per baris."
    },
    {
      id: "vigenere", method: "Vigenère", level: "Sedang", seconds: 120, points: 20, learn: "vigenere",
      text: "UCOK PULANG", encode: p => C.vigenere(p, "NANO"),
      info: () => "Vigenère, kunci NANO. Ulang kunci di bawah pesan, lalu kurangi tiap huruf dengan huruf kunci (A=0)."
    },
    {
      id: "playfair", method: "Playfair", level: "Sulit", seconds: 150, points: 30, learn: "playfair",
      text: "DOSEN HADIR", encode: p => C.playfair(p, "KAMPUS"),
      info: () => `Playfair, kunci KAMPUS. Kisi: ${C.playfairGrid("KAMPUS").match(/.{5}/g).join(" / ")}. Baca per pasangan huruf; I dan J satu kotak.`
    },
    {
      id: "hill", method: "Hill 2×2", level: "Sulit", seconds: 180, points: 30, learn: "hill",
      text: "KELAS LIBUR", encode: p => C.hill(p, hillKey),
      info: () => `Hill 2×2, matriks kunci [[${hillKey[0]}],[${hillKey[1]}]]. Matriks invers modulo 26: [[${hillInverse[0]}],[${hillInverse[1]}]]. Ubah huruf ke angka (A=0), kalikan tiap pasangan dengan matriks invers, lalu ambil sisa bagi 26.`
    }
  ];
  questions.forEach(q => {
    q.plain = q.text.replace(/ /g, "");
    q.cipher = q.encode(q.plain);
    q.grouped = q.cipher.match(/.{1,5}/g).join(" ");
  });

  let results = {};
  let turn = "A";
  let current = null;
  let state = "idle"; // idle | ready | running | finished
  let startedAt = 0;
  let interval = 0;
  let lastTick = -1;

  function loadSaved() {
    try {
      const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!data || typeof data !== "object") return;
      const known = new Set(questions.map(q => q.id));
      const clean = {};
      Object.entries(data.results || {}).forEach(([id, value]) => {
        if (!known.has(id) || !value) return;
        if (value.type === "win" && (value.team === "A" || value.team === "B")) clean[id] = { type: "win", team: value.team };
        else if (value.type === "timeout") clean[id] = { type: "timeout" };
      });
      results = clean;
      turn = data.turn === "B" ? "B" : "A";
    } catch (_) { /* skor hanya untuk sesi ini; abaikan bila tidak terbaca */ }
  }
  function save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ results, turn })); } catch (_) { /* opsional */ }
  }

  function scores() {
    const total = { A: 0, B: 0 };
    questions.forEach(q => {
      const result = results[q.id];
      if (result && result.type === "win") total[result.team] += q.points;
    });
    return total;
  }

  function normalize(value) {
    if (!/^[a-z ]*$/i.test(value)) return null;
    return value.toUpperCase().replace(/ /g, "") || null;
  }

  function renderScores() {
    const total = scores();
    scoreBox.A.textContent = total.A;
    scoreBox.B.textContent = total.B;
    const remaining = questions.filter(q => !(results[q.id] && results[q.id].type === "win"));
    if (!remaining.length) {
      turnBox.textContent = total.A === total.B
        ? `Semua soal terpecahkan. Skor seri ${total.A} : ${total.B}.`
        : `Semua soal terpecahkan. Kelompok ${total.A > total.B ? "A" : "B"} unggul ${Math.max(total.A, total.B)} : ${Math.min(total.A, total.B)}.`;
    } else {
      turnBox.textContent = `Giliran memilih soal: Kelompok ${turn}.`;
    }
    resetButton.disabled = state === "running";
  }

  function cardStatus(q) {
    const result = results[q.id];
    if (!result) return "Belum dimainkan";
    if (result.type === "win") return `Dipecahkan Kelompok ${result.team} (+${q.points})`;
    return "Waktu habis, boleh dicoba lagi";
  }

  function renderPicker() {
    list.replaceChildren(...questions.map((q, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "question-card";
      button.dataset.id = q.id;
      button.dataset.level = q.level;
      const solved = results[q.id] && results[q.id].type === "win";
      button.disabled = Boolean(solved);
      [
        ["q-num", `Soal ${index + 1}`],
        ["q-title", q.method],
        ["q-meta", `${q.level} · ${q.seconds} detik · ${q.points} poin`],
        ["q-status", cardStatus(q)]
      ].forEach(([className, content]) => {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = content;
        button.append(span);
      });
      item.append(button);
      return item;
    }));
    renderScores();
  }

  function stopClock() {
    window.clearInterval(interval);
    interval = 0;
  }

  function setTeamButtons(enabled) {
    teamButtons.forEach(button => { button.disabled = !enabled; });
  }

  function showPicker(focusId) {
    stopClock();
    state = "idle";
    current = null;
    round.hidden = true;
    picker.hidden = false;
    renderPicker();
    const target = (focusId && list.querySelector(`[data-id="${focusId}"]:not(:disabled)`)) || list.querySelector("button:not(:disabled)") || document.querySelector("#picker-title");
    if (target) {
      if (!target.matches("button")) target.setAttribute("tabindex", "-1");
      target.focus();
    }
  }

  function openRound(id) {
    current = questions.find(q => q.id === id);
    if (!current) return;
    stopClock();
    state = "ready";
    picker.hidden = true;
    round.hidden = false;
    roundTitle.textContent = `Soal ${questions.indexOf(current) + 1}: ${current.method}`;
    roundMeta.textContent = `${current.level} · ${current.seconds} detik · ${current.points} poin`;
    cipherBox.textContent = PLACEHOLDER;
    roundInfo.hidden = true;
    roundInfo.textContent = "";
    timer.textContent = `Waktu: ${current.seconds} detik`;
    input.value = "";
    input.disabled = true;
    setTeamButtons(false);
    startButton.textContent = "Mulai Ronde";
    startButton.disabled = false;
    backButton.textContent = "Kembali ke daftar soal";
    learnLink.hidden = false;
    learnLink.href = `metode.html#${current.learn}`;
    learnLink.target = "_blank";
    learnLink.rel = "noopener";
    status.textContent = "Siap? Tekan Mulai Ronde. Pesan dan hitung mundur muncul bersamaan.";
    renderScores();
    startButton.focus();
  }

  function finish(kind, team) {
    stopClock();
    state = "finished";
    const q = current;
    const firstTime = !results[q.id];
    results[q.id] = kind === "win" ? { type: "win", team } : { type: "timeout" };
    if (firstTime || kind === "win") turn = turn === "A" ? "B" : "A";
    save();
    cipherBox.textContent = q.grouped;
    input.disabled = true;
    setTeamButtons(false);
    learnLink.hidden = false;
    backButton.textContent = "Kembali ke daftar soal";
    if (kind === "win") {
      startButton.disabled = true;
      startButton.textContent = "Mulai Ronde";
      status.textContent = `Kelompok ${team} menang +${q.points} poin! Pesan: ${q.text}.`;
    } else {
      startButton.disabled = false;
      startButton.textContent = "Coba soal ini lagi";
      status.textContent = `Waktu habis. Pesan aslinya: ${q.text}.`;
    }
    renderScores();
    (kind === "win" ? backButton : startButton).focus();
  }

  function updateTimer() {
    const remaining = Math.max(0, current.seconds * 1000 - (Date.now() - startedAt));
    const seconds = Math.ceil(remaining / 1000);
    timer.textContent = `Waktu: ${seconds} detik`;
    if (seconds <= 10 && seconds > 0 && seconds !== lastTick) {
      lastTick = seconds;
      sfx("tick");
    }
    if (remaining === 0) {
      sfx("timeup");
      finish("timeout");
    }
  }

  function startRound() {
    if (!current || state === "running") return;
    stopClock();
    state = "running";
    lastTick = -1;
    sfx("start");
    cipherBox.textContent = current.grouped;
    roundInfo.textContent = current.info();
    roundInfo.hidden = false;
    learnLink.hidden = true;
    startedAt = Date.now();
    timer.textContent = `Waktu: ${current.seconds} detik`;
    input.value = "";
    input.disabled = false;
    setTeamButtons(true);
    startButton.disabled = true;
    backButton.textContent = "Batalkan ronde";
    status.textContent = "Ronde berjalan. Ketik tebakan, lalu tekan tombol kelompok yang menebak.";
    resetButton.disabled = true;
    interval = window.setInterval(updateTimer, 100);
    input.focus();
  }

  function submitGuess(team) {
    if (state !== "running") return;
    updateTimer();
    if (state !== "running") return;
    if (input.value.trim() === "") {
      status.textContent = "Masukkan tebakan terlebih dahulu.";
      input.focus();
      return;
    }
    const guess = normalize(input.value);
    if (guess === null) {
      status.textContent = "Gunakan huruf A sampai Z dan spasi saja.";
      input.focus();
      return;
    }
    if (guess === current.plain) {
      sfx("win");
      finish("win", team);
      return;
    }
    sfx("wrong");
    status.textContent = `Belum tepat (Kelompok ${team}). Kedua kelompok masih boleh mencoba selama waktu tersisa.`;
    input.select();
  }

  list.addEventListener("click", event => {
    const button = event.target.closest(".question-card");
    if (button && !button.disabled) openRound(button.dataset.id);
  });
  teamButtons.forEach(button => button.addEventListener("click", () => submitGuess(button.dataset.team)));
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (state === "running") {
      status.textContent = "Tekan tombol Kelompok A atau Kelompok B untuk menentukan siapa yang menebak.";
    }
  });
  startButton.addEventListener("click", startRound);
  backButton.addEventListener("click", () => {
    if (state === "running" && !window.confirm("Batalkan ronde ini? Soal tetap bisa dipilih lagi dan tidak ada poin yang berubah.")) return;
    const id = current && current.id;
    showPicker(id);
  });
  resetButton.addEventListener("click", () => {
    if (state === "running") return;
    if (!window.confirm("Reset skor dan semua soal? Progres cerita tidak ikut terhapus.")) return;
    results = {};
    turn = "A";
    save();
    showPicker();
  });

  loadSaved();
  showPicker();
  // showPicker() memindahkan fokus; di muat-awal biarkan halaman tetap di atas.
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
})();
