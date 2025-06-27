require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');



const app = express();
app.use(cors());
app.use(express.json());



// Load dữ liệu vị trí và điểm tắc nghẽn
const locations = require('./data/locations.json');
const trafficData = require('./data/traffic-points.json');

app.post('/api/check-risk', async (req, res) => {
  const { province } = req.body;

  try {
    const location = locations.find(l => l.name === province);
    if (!location) {
      return res.status(404).json({ message: 'Không tìm thấy tỉnh' });
    }

    const { lat, lon } = location;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&timezone=Asia%2FBangkok`;

    const response = await axios.get(url);
    const raw = response.data.daily;

    // Chuyển đổi dữ liệu thành từng ngày
    const forecast = raw.time.map((date, index) => ({
      date,
      temperature: raw.temperature_2m_max[index],
      precipitation: raw.precipitation_sum[index],
      description:
        raw.precipitation_sum[index] > 20
          ? 'Mưa lớn'
          : raw.temperature_2m_max[index] > 35
          ? 'Nắng nóng'
          : 'Thời tiết ổn định',
    }));

    // Phân loại nguy cơ
    const highTemp = forecast.some(day => day.temperature > 35);
    const heavyRain = forecast.some(day => day.precipitation > 20);

    let risk = 'Thấp';
    if (highTemp && heavyRain) risk = 'Cao';
    else if (highTemp || heavyRain) risk = 'Trung bình';

    const trafficPoints = trafficData[province] || [];

    res.json({
      risk,
      forecast,
      trafficPoints
    });
  } catch (error) {
    console.error('❌ Lỗi gọi API thời tiết:', error.message);
    res.status(500).json({ message: 'Không thể truy cập dữ liệu thời tiết' });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server đang chạy tại cổng ${port}`);
});


