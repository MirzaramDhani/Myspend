// dashboard.js
const supabase = window.supabaseClient;

const user_id = localStorage.getItem("user_id");
document.getElementById("username").innerText =
  localStorage.getItem("username");

async function loadPengeluaran() {
  let { data, error } = await supabase
    .from("pengeluaran")
    .select("*")
    .eq("user_id", user_id)
    .order("tanggal", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById("tabelPengeluaran");
  container.innerHTML = ""; // reset dulu

  // 🔹 Kelompokkan data per bulan-tahun
  const grouped = {};
  data.forEach((row) => {
    const date = new Date(row.tanggal);
    const monthYear = date.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });

    if (!grouped[monthYear]) grouped[monthYear] = [];
    grouped[monthYear].push(row);
  });

  //  Render per bulan
  Object.keys(grouped).forEach((bulan) => {
    // Judul bulan
    const title = document.createElement("h2");
    title.className = "bulan-title";
    title.innerText = bulan;
    container.appendChild(title);

    // Tabel
    const table = document.createElement("table");
    table.className = "tabel-bulanan";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Keperluan</th>
          <th>Jumlah</th>
          <th>Metode</th>
          <th>Keterangan</th>
          <th>Edit</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    let totalBulan = 0;

    grouped[bulan].forEach((row) => {
      tbody.innerHTML += renderRow(row);
      totalBulan += parseInt(row.jumlah);
    });

    container.appendChild(table);

    // Total per bulan
    const totalDiv = document.createElement("div");
    totalDiv.className = "total-bulanan";
    totalDiv.innerText = `Total Pengeluaran ${bulan}: Rp ${totalBulan.toLocaleString(
      "id-ID"
    )}`;
    container.appendChild(totalDiv);
  });
}

// Total Pengeluaran Rentang waktu
document.getElementById("filterButton").addEventListener("click", async () => {
  const mulai = document.getElementById("tanggalMulai").value;
  const akhir = document.getElementById("tanggalAkhir").value;
  const keperluan = document.getElementById("rentangKeperluan").value;
  const hasilTotal = document.getElementById("hasilTotal");

  if (!mulai || !akhir) {
    alert("Pilih kedua tanggal terlebih dahulu!");
    return;
  }

  if (mulai > akhir) {
    alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir!");
    return;
  }

  // 🔹 Mulai query dasar
  let query = supabase
    .from("pengeluaran")
    .select("jumlah, keperluan")
    .eq("user_id", user_id)
    .gte("tanggal", mulai)
    .lte("tanggal", akhir);

  // 🔹 Jika user memilih keperluan tertentu, tambahkan filter
  if (keperluan && keperluan !== "") {
    query = query.eq("keperluan", keperluan);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    hasilTotal.innerText = "Terjadi kesalahan saat mengambil data!";
    return;
  }

  if (!data || data.length === 0) {
    hasilTotal.innerText = "Tidak ada pengeluaran pada rentang tanggal ini.";
    return;
  }

  // 🔹 Hitung total pengeluaran
  const total = data.reduce((acc, row) => acc + parseInt(row.jumlah), 0);

  // 🔹 Tampilkan hasil
  if (keperluan && keperluan !== "") {
    hasilTotal.innerText = `Total Pengeluaran untuk "${keperluan}" dari ${mulai} sampai ${akhir}: Rp ${total.toLocaleString(
      "id-ID"
    )}`;
  } else {
    hasilTotal.innerText = `Total Pengeluaran dari ${mulai} sampai ${akhir}: Rp ${total.toLocaleString(
      "id-ID"
    )}`;
  }

  hasilTotal.style.display = "block";
});

async function tambahPengeluaran() {
  let tanggal = document.getElementById("tanggal").value;
  let keperluan = document.getElementById("keperluan").value;
  let jumlah = parseInt(document.getElementById("jumlah").value); // pastikan integer
  let metode = document.getElementById("metode").value;
  let keterangan = document.getElementById("keterangan").value;

  // Insert pengeluaran
  let { error: insertError } = await supabase
    .from("pengeluaran")
    .insert([{ user_id, tanggal, keperluan, jumlah, metode, keterangan }]);

  if (insertError) {
    console.error(insertError);
    alert("Gagal menambah pengeluaran!");
    return;
  } else {
    alert("Berhasil menambahkan pengeluaran");
  }

  // Ambil saldo terakhir
  let { data: saldoData, error: saldoError } = await supabase
    .from("saldo")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (saldoError || !saldoData) {
    console.error(saldoError);
    alert("Saldo tidak ditemukan!");
    return;
  }

  let tabungan = parseInt(saldoData.tabungan);
  let cash = parseInt(saldoData.cash);

  // Update saldo sesuai metode
  if (metode === "qris" || metode === "transfer") {
    tabungan -= jumlah;
  } else if (metode === "cash") {
    cash -= jumlah;
  }

  let { error: updateError } = await supabase
    .from("saldo")
    .update({ tabungan, cash })
    .eq("user_id", user_id);

  if (updateError) {
    console.error(updateError);
    alert("Gagal update saldo!");
  }

  // Refresh data
  loadPengeluaran();
  loadSaldo();
}

async function loadSaldo() {
  let { data, error } = await supabase
    .from("saldo")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (data) {
    document.getElementById("tabungan").innerText = parseInt(
      data.tabungan
    ).toLocaleString("id-ID");
    document.getElementById("cash").innerText = parseInt(
      data.cash
    ).toLocaleString("id-ID");
    return data;
  } else {
    console.error(error);
  }
}

// Buka modal edit pengeluaran

let jumlah = null;
function openEditPengeluaran(row) {
  document.getElementById("editId").value = row.id;
  document.getElementById("editTanggal").value = row.tanggal;
  document.getElementById("editKeperluan").value = row.keperluan;
  document.getElementById("editJumlah").value = row.jumlah;
  document.getElementById("editMetode").value = row.metode;
  document.getElementById("editKeterangan").value = row.keterangan || "";

  document.getElementById("editOldMetode").value = row.metode;
  document.getElementById("editPengeluaranModal").style.display = "block";
  jumlah = parseInt(row.jumlah);
}

// Tutup modal pengeluaran
function closeEditPengeluaran() {
  document.getElementById("editPengeluaranModal").style.display = "none";
}

// Update pengeluaran
async function updatePengeluaran() {
  let id = document.getElementById("editId").value;
  let tanggal = document.getElementById("editTanggal").value;
  let keperluan = document.getElementById("editKeperluan").value;
  let jumlahNew = parseInt(document.getElementById("editJumlah").value);
  let metodeBaru = document.getElementById("editMetode").value;
  let metodeLama = document.getElementById("editOldMetode").value;
  let keterangan = document.getElementById("editKeterangan").value;

  // Ambil saldo terakhir
  let { data: saldoData, error: saldoError } = await supabase
    .from("saldo")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (saldoError || !saldoData) {
    console.error(saldoError);
    alert("Saldo tidak ditemukan!");
    return;
  }

  let tabungan = parseInt(saldoData.tabungan);
  let cash = parseInt(saldoData.cash);

  console.log("tabungan awal:", tabungan);
  console.log("cash awal:", cash);

  // Kalau metode tidak berubah, lewati update saldo
  if (metodeBaru === metodeLama) {
    console.log("Metode tidak berubah");
  } else {
    // Pulihkan saldo lama terlebih dahulu
    if (metodeLama === "qris" || metodeLama === "transfer") {
      tabungan += jumlah;
    } else if (metodeLama === "cash") {
      cash += jumlah;
    }

    // Kurangi saldo sesuai metode baru
    if (metodeBaru === "qris" || metodeBaru === "transfer") {
      tabungan -= jumlah;
    } else if (metodeBaru === "cash") {
      cash -= jumlah;
    }
  }

  if (jumlah !== jumlahNew) {
    jumlah -= jumlahNew;
    console.log("selisih jumlah: ", jumlah);
    if (metodeBaru === "qris" || metodeBaru === "transfer") {
      tabungan += jumlah;
    } else if (metodeBaru === "cash") {
      cash += jumlah;
    }
  }

  // Update saldo
  let { error: updateError } = await supabase
    .from("saldo")
    .update({ tabungan, cash })
    .eq("user_id", user_id);

  if (updateError) {
    console.error(updateError);
    alert("Gagal update saldo!");
  }

  // Update data pengeluaran di database
  let { error } = await supabase
    .from("pengeluaran")
    .update({
      tanggal,
      keperluan,
      jumlah: jumlahNew,
      metode: metodeBaru,
      keterangan,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Gagal update pengeluaran!");
  } else {
    closeEditPengeluaran();
    loadPengeluaran();
    loadSaldo();
  }
}

async function hapusPengeluaran() {
  const id = document.getElementById("editId").value;

  if (!confirm("Yakin ingin menghapus pengeluaran ini?")) return;

  // Ambil data sebelum hapus (supaya saldo bisa dikembalikan)
  let { data: pengeluaranData, error: getError } = await supabase
    .from("pengeluaran")
    .select("*")
    .eq("id", id)
    .single();

  if (getError || !pengeluaranData) {
    console.error(getError);
    alert("Gagal ambil data pengeluaran!");
    return;
  }

  const jumlah = parseInt(pengeluaranData.jumlah);
  const metode = pengeluaranData.metode;

  // 🔹 Hapus pengeluaran
  let { error: deleteError } = await supabase
    .from("pengeluaran")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error(deleteError);
    alert("Gagal hapus pengeluaran!");
    return;
  }

  // 🔹 Ambil saldo terakhir
  let { data: saldoData, error: saldoError } = await supabase
    .from("saldo")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (saldoError || !saldoData) {
    console.error(saldoError);
    alert("Saldo tidak ditemukan!");
    return;
  }

  let tabungan = parseInt(saldoData.tabungan);
  let cash = parseInt(saldoData.cash);

  // 🔹 Kembalikan saldo sesuai metode
  if (metode === "qris" || metode === "transfer") {
    tabungan += jumlah;
  } else if (metode === "cash") {
    cash += jumlah;
  }

  // 🔹 Update saldo
  let { error: updateError } = await supabase
    .from("saldo")
    .update({ tabungan, cash })
    .eq("user_id", user_id);

  if (updateError) {
    console.error(updateError);
    alert("Gagal update saldo!");
  }

  // 🔹 Refresh
  closeEditPengeluaran();
  loadPengeluaran();
  loadSaldo();
}

// Tambahkan tombol Edit di tiap baris
function renderRow(row) {
  // encode row agar aman dipanggil di onclick
  const rowStr = encodeURIComponent(JSON.stringify(row));
  return `
    <tr>
      <td>${row.tanggal}</td>
      <td>${row.keperluan}</td>
      <td>Rp ${parseInt(row.jumlah).toLocaleString("id-ID")}</td>
      <td>${row.metode}</td>
      <td>${row.keterangan || ""}</td>
      <td><button onclick='openEditPengeluaran(JSON.parse(decodeURIComponent("${rowStr}")))' class="btn-edit">Edit</button></td>
    </tr>`;
}

async function loadCatatanTerakhir() {
  const { data, error } = await supabase
    .from("catatan")
    .select("isi")
    .eq("user_id", user_id)
    .single();

  if (error) {
    console.error("Gagal memuat catatan:", error);
    return;
  }

  if (data) {
    document.getElementById("catatanTeks").value = data.isi;
  } else {
    document.getElementById("catatanTeks").value = "";
  }
}

// Fungsi menyimpan atau mengedit catatan
const catatanInput = document.getElementById("catatanTeks");

catatanInput.addEventListener("blur", async () => {
  const isi = catatanInput.value.trim();
  const { error } = await supabase.from("catatan").upsert({ user_id, isi });

  if (error) {
    console.error(error);
    alert("Gagal menyimpan catatan!");
  } else {
    console.log("Catatan tersimpan");
  }
});

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  alert("Browser kamu belum mendukung speech recognition!");
}

const recognition = new SpeechRecognition();
recognition.lang = "id-ID";
recognition.continuous = false;
recognition.interimResults = false;
const voiceBtn = document.getElementById("voiceButton");
const speechResult = document.getElementById("speechResult");

let speechTimeout;
let hasResult = false; // penanda apakah ada hasil suara

voiceBtn.addEventListener("click", () => {
  try {
    recognition.start();
    voiceBtn.classList.add("listening");
    speechResult.innerText = "Mendengarkan...";
    hasResult = false;

    clearTimeout(speechTimeout);
    // Timeout otomatis berhenti kalau tidak ada hasil
    speechTimeout = setTimeout(() => {
      if (!hasResult) {
        recognition.stop();
        voiceBtn.classList.remove("listening");
        speechResult.innerText = "Error: Tidak ada kata terdeteksi!";
      }
    }, 10000); // 10 detik
  } catch (err) {
    console.error("Gagal memulai speech recognition:", err);
    speechResult.innerText = "Error: Tidak dapat memulai mikrofon.";
  }
});

recognition.onresult = async (event) => {
  hasResult = true;
  clearTimeout(speechTimeout);
  voiceBtn.classList.remove("listening");
  const speech = event.results[0][0].transcript.toLowerCase();
  speechResult.innerText = `"${speech}"`;

  // Parsing dasar
  const tanggal = new Date();
  let keperluan = "";
  let jumlah = 0;
  let metode = "cash";
  let keterangan = "";

  // Pecah hasil suara jadi array kata
  let words = speech.split(/\s+/);
  let used = new Set();

  nowDate = ["hari", "ini", "sekarang"];
  if (nowDate.some((w) => words.includes(w))) {
    nowDate.forEach((w) => used.add(w));
  }
  if (words.includes("kemarin")) {
    tanggal.setDate(tanggal.getDate() - 1);
    used.add("kemarin");
  }
  const tanggalFormatted = tanggal.toISOString().split("T")[0];
  const kategori = {
    makan: ["makan","jajan","sarapan"],
    bensin: ["bensin"],
    belanja: ["belanja","beli"],
    laundry: ["laundry", "londri"],
    toko_online: ["shopee", "sopi", "tiktok", "online", "onlen"],
  };
  for (const [key, keywords] of Object.entries(kategori)) {
    if (keywords.some((word) => words.includes(word))) {
      keperluan = key;
      keywords.forEach((w) => used.add(w));
      break;
    }
  }
  if (!keperluan) keperluan = "lain-lain";
  const qrisKeywords = [
    "qris",
    "kris",
    "keris",
    "chris",
    "christ",
    "grace",
    "gr",
  ];
  const transferKeywords = ["transfer", "tf"];
  if (qrisKeywords.some((keyword) => speech.includes(keyword))) {
    metode = "qris";
    qrisKeywords.forEach((w) => used.add(w));
  }

  if (transferKeywords.some((w) => words.includes(w))) {
    metode = "transfer";
    transferKeywords.forEach((w) => used.add(w));
  }
  // Normalisasi teks: ubah titik menjadi kosong, biar "10.000" jadi "10000"
  let speechNormalized = speech.replace(/\./g, "").replace(/rp/g, "").trim();

  const angkaMatch = speechNormalized.match(/(\d+)\s*ribu/); // contoh: "20 ribu"
  const angkaBiasa = speechNormalized.match(/\d+/); // fallback: "20000" atau "20.000"

  if (angkaMatch) {
    jumlah = parseInt(angkaMatch[1]) * 1000;
    // tandai kata "ribu" dan angka sebagai digunakan
    words.forEach((w) => {
      if (w.includes(angkaMatch[1]) || w === "ribu") used.add(w);
    });
  } else if (angkaBiasa) {
    jumlah = parseInt(angkaBiasa[0]);
    words.forEach((w) => {
      if (/\d/.test(w)) used.add(w);
    });
  } else {
    alert("Jumlah tidak terdeteksi, sebutkan nominal dengan angka!");
    return;
  }

  let sisaKata = words.filter((w) => !used.has(w) && w.trim() !== "");
  keterangan = sisaKata.join(" ").trim();
  if (!keterangan) keterangan = "";

  let { error } = await supabase
      .from("pengeluaran")
      .insert([{ user_id, tanggal: tanggalFormatted, keperluan, jumlah, metode, keterangan }]);

  if (error) {
    console.error(error);
    alert("Gagal menyimpan pengeluaran!");
  } else {
    alert(
      `Pengeluaran ${keperluan} sebesar Rp ${jumlah.toLocaleString(
        "id-ID"
      )} berhasil disimpan!`
    );
  }

  loadPengeluaran();
  loadSaldo();
};
recognition.onerror = (err) => {
  clearTimeout(speechTimeout);
  hasResult = false;
  speechResult.innerText = `Error: ${err.error}`;
  voiceBtn.classList.remove("listening");

  // pastikan berhenti mendengarkan
  recognition.stop();
};

// === Modal Edit Saldo ===
function openEditSaldo() {
  const tabunganNow = document
    .getElementById("tabungan")
    .innerText.replace(/\./g, "");
  const cashNow = document.getElementById("cash").innerText.replace(/\./g, "");

  document.getElementById("editTabungan").value = parseInt(tabunganNow);
  document.getElementById("editCash").value = parseInt(cashNow);

  document.getElementById("editSaldoModal").style.display = "block";
}

function closeEditSaldo() {
  document.getElementById("editSaldoModal").style.display = "none";
  document.getElementById("tambahTabungan").style.display = "none";
  document.getElementById("tambahCash").style.display = "none";
}

// === Tampilkan panel tambah saldo ===
function toggleTambah(tipe) {
  const target = document.getElementById(
    "tambah" + tipe.charAt(0).toUpperCase() + tipe.slice(1)
  );
  target.style.display = target.style.display === "none" ? "block" : "none";
}

// === Fungsi menambah saldo (baik tabungan maupun cash) ===

function tambahSaldo(tipe, nominal) {
  const inputUtama = document.getElementById(
    tipe === "tabungan" ? "editTabungan" : "editCash"
  );
  let currentSaldo = parseInt(inputUtama.value) || 0;

  if (nominal) {
    currentSaldo += nominal;
  }
  inputUtama.value = currentSaldo;

  // Sembunyikan panel tambah setelah menambah saldo
  const target = document.getElementById(
    "tambah" + tipe.charAt(0).toUpperCase() + tipe.slice(1)
  );
  target.style.display = "none";
}

// === Fungsi Simpan Perubahan ke Supabase ===
async function updateSaldo() {
  let tabungan = parseInt(document.getElementById("editTabungan").value) || 0;
  let cash = parseInt(document.getElementById("editCash").value) || 0;
  const inputTabungan =
    parseInt(document.getElementById("jumlahTambahTabungan").value) || 0;
  const inputCash =
    parseInt(document.getElementById("jumlahTambahCash").value) || 0;
  const tabunganNow = document
    .getElementById("tabungan")
    .innerText.replace(/\./g, "");
  const cashNow = document.getElementById("cash").innerText.replace(/\./g, "");

  tabungan += parseInt(inputTabungan);
  cash += parseInt(inputCash);

  const tabunganThen = tabungan - tabunganNow;
  const cashThen = cash - cashNow;

  const { error } = await supabase
    .from("saldo")
    .upsert({ user_id: user_id, tabungan, cash });

  if (error) {
    console.error(error);
    alert("Gagal update saldo!");
  } else {
    document.getElementById("jumlahTambahTabungan").value = "";
    document.getElementById("jumlahTambahCash").value = "";
    alert(
      `Berhasil mengedit saldo tabungan sebesar: ${tabunganThen} dan cash sebesar: ${cashThen}`
    );
    closeEditSaldo();
    loadSaldo();
  }
}

loadPengeluaran();
loadCatatanTerakhir();
loadSaldo();
