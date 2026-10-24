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
  
  const qrCodeData = 'ECO-QR-' + Math.floor(100000 + Math.random() * 900000);
  
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
  console.log(`Server is running on port ${PORT}`);
});
