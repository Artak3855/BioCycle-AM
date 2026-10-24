import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let stats = {
  totalWasteCollectedKg: 1450,
  activeHouseholds: 410,
  biogasProducedM3: 560,
  fertilizerProducedKg: 720
};

let userRewards = {
  points: 350
};

// Expanded B2B Partners List
const partners = [
  { id: 1, name: "Yerevan City", category: "Supermarket", discount: "10% զեղչ մրգերի համար", cost: 100 },
  { id: 2, name: "Զովք (Zovq)", category: "Supermarket", discount: "15% զեղչ կաթնամթերքի համար", cost: 120 },
  { id: 3, name: "Թումանյան Շաուրմա", category: "Fast Food", discount: "Անվճար ըմպելիք", cost: 150 },
  { id: 4, name: "ԿԱՖԵ ԿԱՐԱՍ", category: "Restaurant", discount: "20% զեղչ ճաշացանկի համար", cost: 250 },
  { id: 5, name: "KFC Armenia", category: "Fast Food", discount: "10% զեղչ բոլոր կոմբինացիաներին", cost: 130 },
  { id: 6, name: "Green Bean", category: "Cafe", discount: "Անվճար սուրճ", cost: 200 }
];

app.get('/api/stats', (req, res) => {
  res.json(stats);
});

app.get('/api/partners', (req, res) => {
  res.json(partners);
});

app.post('/api/deposit', (req, res) => {
  const { weight } = req.body;
  const parsedWeight = parseFloat(weight) || 2;
  stats.totalWasteCollectedKg += parsedWeight;
  stats.biogasProducedM3 += parsedWeight * 0.4;
  stats.fertilizerProducedKg += parsedWeight * 0.5;
  
  const earnedCoins = Math.round(parsedWeight * 100);
  userRewards.points += earnedCoins;
  
  const qrCodeData = 'ECO-DEPOSIT-' + Math.floor(100000 + Math.random() * 900000);
  
  res.json({
    success: true,
    earnedCoins,
    totalPoints: userRewards.points,
    qrCode: qrCodeData,
    validity: "Գործում է 30 օր հաշվեգրման պահից"
  });
});

app.get('/api/user', (req, res) => {
  res.json(userRewards);
});

app.post('/api/redeem', (req, res) => {
  const { cost, partnerName, discountText } = req.body;
  if (userRewards.points >= cost) {
    userRewards.points -= cost;
    res.json({
      success: true,
      partnerName,
      discountText,
      couponCode: 'ECO-DISCOUNT-' + Math.floor(100000 + Math.random() * 900000),
      validity: "Գործում է 30 օր ստացման պահից"
    });
  } else {
    res.status(400).json({ success: false, message: 'Բավարար միավորներ չկան:' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); }); ```  ---  ### 2. `public/index.html` (Թարմացված վեբ կայք՝ լեզվի փոխարկիչով, QR կոդով և Երևանի քարտեզով) ```html <!DOCTYPE html> <html lang="hy"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>BioCycle-AM \vert{} Yerevan Eco-Loop Demo</title> <script src="https://cdn.tailwindcss.com"></script> <!-- Leaflet CSS for Map --> <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /> </head> <body class="bg-gray-50 text-gray-800 font-sans"> <div class="max-w-5xl mx-auto p-4 md:p-6"> <!-- Header with Language Switcher --> <header class="bg-green-600 text-white p-6 rounded-2xl shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4"> <div> <h1 class="text-3xl font-bold" id="txt-title">BioCycle-AM 🌿</h1> <p class="text-green-100" id="txt-subtitle">Երևանի օրգանական աղբի վերամշակման և էկո-բոնուսների պլատֆորմ</p> </div> <div class="flex items-center gap-4"> <select id="lang-select" onchange="changeLanguage()" class="bg-green-700 text-white border border-green-500 rounded-lg px-3 py-1 font-semibold focus:outline-none"> <option value="hy">🇦🇲 Հայերեն</option> <option value="en">🇬🇧 English</option> </select> <div class="bg-white text-green-700 px-4 py-2 rounded-xl font-bold shadow"> <span id="txt-points-label">Միավորներ՝</span> <span id="user-points">350</span> 🪙 </div> </div> </header>  <main class="grid gap-8"> <!-- Stats Section --> <section class="grid grid-cols-2 md:grid-cols-4 gap-4"> <div class="bg-white p-4 rounded-xl shadow border border-green-100 text-center"> <h3 class="text-gray-500 text-sm" id="stat-l1">Հավաքված աղբ</h3> <p id="stat-waste" class="text-2xl font-bold text-green-600">1450 կգ</p> </div> <div class="bg-white p-4 rounded-xl shadow border border-green-100 text-center"> <h3 class="text-gray-500 text-sm" id="stat-l2">Ակտիվ ընտանիքներ</h3> <p id="stat-households" class="text-2xl font-bold text-green-600">410</p> </div> <div class="bg-white p-4 rounded-xl shadow border border-green-100 text-center"> <h3 class="text-gray-500 text-sm" id="stat-l3">Բիոգազ</h3> <p id="stat-biogas" class="text-2xl font-bold text-green-600">560 մ³</p> </div> <div class="bg-white p-4 rounded-xl shadow border border-green-100 text-center"> <h3 class="text-gray-500 text-sm" id="stat-l4">Պարարտանյութ</h3> <p id="stat-fert" class="text-2xl font-bold text-green-600">720 կգ</p> </div> </section>  <!-- Map Section --> <section class="bg-white p-6 rounded-2xl shadow"> <h2 class="text-xl font-bold mb-4 text-green-700" id="map-title">📍 Երևանի Խելացի Աղբարկղների Ցանցը (5 ՊիլոտայինԿետեր)</h2> <div id="map" class="w-full h-72 rounded-xl z-10 border"></div> </section>  <!-- Simulator Section --> <section class="bg-white p-6 rounded-2xl shadow"> <h2 class="text-xl font-bold mb-4 text-green-700" id="sim-title">♻️ Սմարթ Արկղի Սիմուլյատոր (Աղբի հանձնում)</h2> <div class="flex flex-wrap gap-4 items-center"> <input type="number" id="waste-weight" value="2" min="0.5" step="0.5" class="border p-2 rounded-lg w-32"> <span class="text-gray-600" id="sim-unit">կգ օրգանական աղբ</span> <button onclick="depositWaste()" class="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition" id="sim-btn">Հանձնել և ստանալ Eco-Coins</button> </div> <!-- QR Code Result Box --> <div id="deposit-result" class="mt-4 hidden p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col md:flex-row items-center gap-4"> <div class="bg-white p-3 rounded-lg shadow border text-center"> <p class="text-xs text-gray-500">QR CODE MOCK</p> <p id="qr-code-text" class="font-mono font-bold text-lg text-green-800">ECO-123456</p> </div> <div> <p id="deposit-msg" class="font-medium text-green-700"></p> <p id="validity-msg" class="text-sm text-gray-500 mt-1">⏳ Գործում է 30 օր հաշվեգրման պահից</p> </div> </div> </section>  <!-- B2B Marketplace Section --> <section class="bg-white p-6 rounded-2xl shadow"> <h2 class="text-xl font-bold mb-4 text-green-700" id="market-title">🎁 B2B Զեղչերի Շուկա (Marketplace)</h2> <div id="partners-grid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4"> <!-- Dynamic Partners loaded via JS --> </div> <div id="redeem-result" class="mt-4 hidden p-4 bg-blue-50 border border-blue-200 rounded-xl"> <p id="redeem-msg" class="font-medium text-blue-800"></p> </div> </section> </main> </div>  <!-- Leaflet JS --> <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script> <script> let currentLang = 'hy';  const translations = { hy: { title: "BioCycle-AM 🌿", subtitle: "Երևանի օրգանական աղբի վերամշակման և էկո-բոնուսների պլատֆորմ", pointsLabel: "Միավորներ՝", stat1: "Հավաքված աղբ", stat2: "Ակտիվ ընտանիքներ", stat3: "Բիոգազ", stat4: "Պարարտանյութ", mapTitle: "📍 Երևանի Խելացի Աղբարկղների Ցանցը (5 Պիլոտային Կետեր)", simTitle: "♻️ Սմարթ Արկղի Սիմուլյատոր (Աղբի հանձնում)", simUnit: "կգ օրգանական աղբ", simBtn: "Հանձնել և ստանալ Eco-Coins", marketTitle: "🎁 B2B Զեղչերի Շուկա (Marketplace)", buyBtn: "Ձեռք բերել", validityText: "⏳ Գործում է 30 օր ստացման պահից" }, en: { title: "BioCycle-AM 🌿", subtitle: "Yerevan Organic Waste Recycling & Eco-Rewards Platform", pointsLabel: "Points:", stat1: "Waste Collected", stat2: "Active Households", stat3: "Biogas Produced", stat4: "Fertilizer Produced", mapTitle: "📍 Yerevan Smart Bins Network (5 Pilot Locations)", simTitle: "♻️ Smart Bin Simulator (Deposit Waste)", simUnit: "kg organic waste", simBtn: "Deposit & Get Eco-Coins", marketTitle: "🎁 B2B Discount Marketplace", buyBtn: "Redeem", validityText: "⏳ Valid for 30 days from issuance" } };  function changeLanguage() { currentLang = document.getElementById('lang-select').value; const t = translations[currentLang]; document.getElementById('txt-title').innerText = t.title; document.getElementById('txt-subtitle').innerText = t.subtitle; document.getElementById('txt-points-label').innerText = t.pointsLabel; document.getElementById('stat-l1').innerText = t.stat1; document.getElementById('stat-l2').innerText = t.stat2; document.getElementById('stat-l3').innerText = t.stat3; document.getElementById('stat-l4').innerText = t.stat4; document.getElementById('map-title').innerText = t.mapTitle; document.getElementById('sim-title').innerText = t.simTitle; document.getElementById('sim-unit').innerText = t.simUnit; document.getElementById('sim-btn').innerText = t.simBtn; document.getElementById('market-title').innerText = t.marketTitle; loadPartners(); }  // Initialize Leaflet Map centered in Yerevan const map = L.map('map').setView([40.1872, 44.5152], 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);  // 5 Smart Bins in Yerevan const bins = [ { name: "Smart Bin #1: Հանրապետության Հրապարակ", lat: 40.1776, lng: 44.5126 }, { name: "Smart Bin #2: Հյուսիսային Պողոտա", lat: 40.1833, lng: 44.5150 }, { name: "Smart Bin #3: ԵՊՀ Գլխավոր Մասնաշենք", lat: 40.1813, lng: 44.5264 }, { name: "Smart Bin #4: Կոմիտասի Պողոտա", lat: 40.2045, lng: 44.5118 }, { name: "Smart Bin #5: Դալմա Մոլլի Հարևանությամբ", lat: 40.1830, lng: 44.4855 } ];  bins.forEach(bin => { L.marker([bin.lat, bin.lng]).addTo(map) .bindPopup(`<b>${bin.name}</b><br>Status: Online 🟢`);
        });

        async function fetchStats() {
            const res = await fetch('/api/stats');
            const data = await res.json();
            document.getElementById('stat-waste').innerText = data.totalWasteCollectedKg + ' կգ';
            document.getElementById('stat-households').innerText = data.activeHouseholds;
            document.getElementById('stat-biogas').innerText = data.biogasProducedM3 + ' մ³';
            document.getElementById('stat-fert').innerText = data.fertilizerProducedKg + ' կգ';
        }

        async function fetchUser() {
            const res = await fetch('/api/user');
            const data = await res.json();
            document.getElementById('user-points').innerText = data.points;
        }

        async function loadPartners() {
            const res = await fetch('/api/partners');
            const partners = await res.json();
            const grid = document.getElementById('partners-grid');
            const t = translations[currentLang];
            grid.innerHTML = '';
            partners.forEach(p => {
                grid.innerHTML += `
                    <div class="border p-4 rounded-xl flex flex-col justify-between shadow-sm bg-gray-50">
                        <div>
                            <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">${p.category}</span>
                            <h4 class="font-bold text-lg mt-2">${p.name}</h4>
                            <p class="text-sm text-gray-600 mt-1">${p.discount}</p>
                        </div>
                        <div class="mt-4 flex justify-between items-center">
                            <span class="text-sm font-bold text-green-700">${p.cost} Coins</span>
                            <button onclick="redeemCoupon(${p.cost}, '${p.name}', '${p.discount}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">${t.buyBtn}</button>
                        </div>
                    </div>
                `;
            });
        }

        async function depositWaste() {
            const weight = document.getElementById('waste-weight').value;
            const res = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight })
            });
            const data = await res.json();
            
            document.getElementById('deposit-result').classList.remove('hidden');
            document.getElementById('qr-code-text').innerText = data.qrCode;
            document.getElementById('deposit-msg').innerText = (currentLang === 'hy' ? `Հաջողությամբ հանձնվեց ${weight} կգ աղբ։ Ստացաք +${data.earnedCoins} Eco-Coins!` : `Successfully deposited ${weight} kg. Earned +${data.earnedCoins} Eco-Coins!`);
            document.getElementById('validity-msg').innerText = (currentLang === 'hy' ? '⏳ Գործում է 30 օր հաշվեգրման պահից' : '⏳ Valid for 30 days from issuance');
            
            fetchStats();
            fetchUser();
        }

        async function redeemCoupon(cost, partnerName, discountText) {
            const res = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cost, partnerName, discountText })
            });
            const data = await res.json();
            const resultBox = document.getElementById('redeem-result');
            resultBox.classList.remove('hidden');
            
            if(data.success) {
                resultBox.className = "mt-4 p-4 bg-green-50 border border-green-200 rounded-xl";
                document.getElementById('redeem-msg').innerHTML = `✅ <b>${partnerName}</b> -${discountText}<br><b>Coupon Code:</b> <span class="font-mono text-green-8
