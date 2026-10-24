const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data for the demo
let stats = {
  totalWasteCollectedKg: 1250,
  activeHouseholds: 340,
  biogasProducedM3: 480,
  fertilizerProducedKg: 620
};

let userRewards = {
  points: 250
};

// API Endpoints
app.get('/api/stats', (req, res) => {
  res.json(stats);
});

app.post('/api/deposit', (req, res) => {
  const { weight } = req.body;
  const parsedWeight = parseFloat(weight) || 2;
  stats.totalWasteCollectedKg += parsedWeight;
  stats.biogasProducedM3 += parsedWeight * 0.4;
  stats.fertilizerProducedKg += parsedWeight * 0.5;
  
  const earnedCoins = Math.round(parsedWeight * 100);
  userRewards.points += earnedCoins;
  
  res.json({
    success: true,
    message: `Հաջողությամբ հանձնվել է ${parsedWeight} կգ օրգանական աղբ։`,
    earnedCoins,
    totalPoints: userRewards.points
  });
});

app.get('/api/user', (req, res) => {
  res.json(userRewards);
});

app.post('/api/redeem', (req, res) => {
  const { cost, partnerName } = req.body;
  if (userRewards.points >= cost) {
    userRewards.points -= cost;
    res.json({
      success: true,
      message: `Դուք ձեռք բերեցիք զեղչ ${partnerName}-ից!`,
      couponCode: 'ECO-' + Math.floor(100000 + Math.random() * 900000)
    });
  } else {
    res.status(400).json({ success: false, message: 'Բավարար միավորներ չկան:' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
