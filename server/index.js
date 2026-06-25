const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const targetsRouter = require('./routes/targets');
const foodsRouter = require('./routes/foods');
const mealsRouter = require('./routes/meals');
const parseRouter = require('./routes/parse');

app.use('/api/targets', targetsRouter);
app.use('/api/foods', foodsRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/parse-meal', parseRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`GlucoTrack server running on http://localhost:${PORT}`);
});
