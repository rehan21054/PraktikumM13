// =========================================
// KONFIGURASI API
// =========================================
const url = "https://predict-6a0d2cce2e7e52d13aa7-dproatj77a-et.a.run.app/predict";

// Deklarasi apiKey (Pastikan huruf 'K' besar)
const apiKey = "ul_b2ec0b34082de397cea80e140bf5f05a24691d5d";

// =========================================
// MENGAMBIL ELEMEN HTML DARI DOM
// =========================================
const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const resultImage = document.getElementById("resultImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const detectBtn = document.querySelector(".detect-btn");

// ======================================================
// PREVIEW GAMBAR SAAT FILE DIPILIH
// ======================================================
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove("d-none");
    };
    reader.readAsDataURL(file);
});

// ======================================================
// KETIKA TOMBOL DETECT DIKLIK
// ======================================================
detectBtn.addEventListener("click", async () => {
    if (!fileInput.files[0]) {
        alert("Pilih gambar dulu!");
        return;
    }

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("conf", "0.25");
    form.append("iou", "0.7");
    form.append("imgsz", "640");

    try {
        console.log("Mengirim request ke API...");

        const response = await fetch(url, {
            method: "POST",
            headers: {
                // Variabel apiKey dipanggil di sini
                Authorization: `Bearer ${apiKey}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("HASIL API:", data);

        resultImage.src = imagePreview.src;
        resultImage.onload = () => {
            drawResult(data);
        };

    } catch (err) {
        console.error("ERROR:", err);
        alert("Error API: " + err.message);
    }
});

// ======================================================
// MEMBUAT WARNA BERDASARKAN NAMA CLASS
// ======================================================
function getColorFromClass(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash >> 0) & 255;
    const g = (hash >> 8) & 255;
    const b = (hash >> 16) & 255;
    return { r, g, b };
}

// ======================================================
// MENENTUKAN WARNA TEKS (HITAM / PUTIH)
// ======================================================
function getTextColor(r, g, b) {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 186 ? "#000" : "#fff";
}

// ======================================================
// FUNGSI UTAMA UNTUK MENAMPILKAN HASIL DETEKSI
// ======================================================
function drawResult(data) {
    console.log("DRAW RESULT:", data);

    const results = data.images?.[0]?.results || [];
    const list = document.getElementById("resultList");
    
    // Reset isi list jika elemennya ada di HTML
    if (list) list.innerHTML = "";

    const img = resultImage;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach(pred => {
        const { x1, y1, x2, y2 } = pred.box;
        console.log("RAW BOX:", x1, y1, x2, y2);

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        const { r, g, b } = getColorFromClass(pred.name);
        const bgColor = `rgb(${r}, ${g}, ${b})`;
        const textColor = getTextColor(r, g, b);

        // --- MENGGAMBAR BOUNDING BOX ---
        ctx.strokeStyle = bgColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, w, h);

        // --- MENGGAMBAR LABEL BACKGROUND ---
        ctx.fillStyle = bgColor;
        ctx.fillRect(left, top - 18, 140, 18);

        // --- MENGGAMBAR TEXT LABEL ---
        ctx.fillStyle = textColor;
        ctx.font = "12px sans-serif";
        ctx.fillText(`${pred.name} (${(pred.confidence * 100).toFixed(1)}%)`, left + 5, top - 5);

        // --- MENAMBAH HASIL KE LIST HTML ---
        if (list) {
            const li = document.createElement("li");
            li.textContent = `${pred.name} (${(pred.confidence * 100).toFixed(1)}%)`;
            list.appendChild(li);
        }

        // --- MENGGAMBAR SEGMENTATION MASK ---
        if (pred.segments && pred.segments.x && pred.segments.x.length > 0) {
            const segX = pred.segments.x;
            const segY = pred.segments.y;

            ctx.beginPath();
            for (let i = 0; i < segX.length; i++) {
                const x = segX[i] * scaleX;
                const y = segY[i] * scaleY;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
            ctx.fill();

            ctx.strokeStyle = bgColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    // Jika tidak ada hasil deteksi
    if (results.length === 0 && list) {
        const li = document.createElement("li");
        li.textContent = "Tidak ada objek terdeteksi";
        list.appendChild(li);
    }
}
