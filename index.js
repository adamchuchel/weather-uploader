require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fetchWeather() {
  try {
    const url = `https://api.weather.com/v2/pws/observations/current?stationId=${process.env.STATION_ID}&format=json&units=m&apiKey=${process.env.WEATHER_API_KEY}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Chyba při získávání počasí:', error.message);
    return null;
  }
}

async function saveWeather(data) {
  if (!data || !data.observations || data.observations.length === 0) {
    console.log('Žádná data k uložení');
    return;
  }

  const obs = data.observations[0];
  const {
    stationID,
    obsTimeLocal,
    humidity,
    winddir,
    metric: { temp, heatIndex, dewpt, windChill, windSpeed, windGust, pressure, precipRate, precipTotal, elev }
  } = obs;

  const query = `
    INSERT INTO weather_data (
      station_id, observation_time, humidity, wind_direction,
      temperature, heat_index, dew_point, wind_chill, wind_speed, wind_gust,
      pressure, precip_rate, precip_total, elevation
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (station_id, observation_time) DO NOTHING
  `;

  try {
    await pool.query(query, [
      stationID, obsTimeLocal, humidity, winddir,
      temp, heatIndex, dewpt, windChill, windSpeed, windGust,
      pressure, precipRate, precipTotal, elev
    ]);
    console.log('Data uložena do DB.');
  } catch (err) {
    console.error('Chyba při ukládání do DB:', err.message);
  }
}

async function main() {
  const weatherData = await fetchWeather();
  await saveWeather(weatherData);
  await pool.end();
}

main();

