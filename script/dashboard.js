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
    .order("tanggal");

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
    document.getElementById("tabungan").innerText = parseInt(data.tabungan).toLocaleString("id-ID");
    document.getElementById("cash").innerText = parseInt(data.cash).toLocaleString("id-ID");
    return data;
  } else {
    console.error(error);
  }
}

// 🔹 Buka modal edit pengeluaran
function openEditPengeluaran(row) {
  document.getElementById("editId").value = row.id;
  document.getElementById("editTanggal").value = row.tanggal;
  document.getElementById("editKeperluan").value = row.keperluan;
  document.getElementById("editJumlah").value = row.jumlah;
  document.getElementById("editMetode").value = row.metode;
  document.getElementById("editKeterangan").value = row.keterangan || "";

  document.getElementById("editOldMetode").value = row.metode
  document.getElementById("editPengeluaranModal").style.display = "block";
}

// 🔹 Tutup modal pengeluaran
function closeEditPengeluaran() {
  document.getElementById("editPengeluaranModal").style.display = "none";
}

// 🔹 Update pengeluaran
async function updatePengeluaran() {
  let id = document.getElementById("editId").value;
  let tanggal = document.getElementById("editTanggal").value;
  let keperluan = document.getElementById("editKeperluan").value;
  let jumlah = parseInt(document.getElementById("editJumlah").value);
  let metodeBaru = document.getElementById("editMetode").value;
  let metodeLama = document.getElementById("editOldMetode").value;
  let keterangan = document.getElementById("editKeterangan").value;

  // Kalau metode tidak berubah, lewati update saldo
  if (metodeBaru === metodeLama) {
    console.log("Metode tidak berubah, saldo tidak diubah");
  } else {
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

    // Update saldo
    let { error: updateError } = await supabase
      .from("saldo")
      .update({ tabungan, cash })
      .eq("user_id", user_id);

    if (updateError) {
      console.error(updateError);
      alert("Gagal update saldo!");
    }
  }

  // Update data pengeluaran di database
  let { error } = await supabase
    .from("pengeluaran")
    .update({ tanggal, keperluan, jumlah, metode: metodeBaru, keterangan })
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

  // 🔹 Ambil data sebelum hapus (supaya saldo bisa dikembalikan)
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



// 🔹 Tambahkan tombol Edit di tiap baris
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

// 🔹 Modal Edit Saldo
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
}

async function updateSaldo() {
  let tabungan = document.getElementById("editTabungan").value;
  let cash = document.getElementById("editCash").value;
  let { error } = await supabase
    .from("saldo")
    .upsert({ user_id: user_id, tabungan, cash });

  if (error) {
    console.error(error);
    alert("Gagal update saldo!");
  } else {
    closeEditSaldo();
    loadSaldo();
  }
}

loadPengeluaran();
loadSaldo();
