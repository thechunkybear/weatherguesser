// App.js
import React, { useState, useEffect } from 'react';
import countries from 'world-countries';
import cities from 'cities.json';
import { getDistance } from 'geolib';
import Fuse from 'fuse.js';
import './App.css';
import { fetchWeatherApi } from 'openmeteo';
import { wmoCode } from './util.ts'

// Create country lookup object
const createCountryLookup = () => {
  const lookup = {};
  
  countries.forEach(country => {
    const name = country.name.common;
    const capitalName = country.capital && country.capital[0];

    // Skip countries without a capital
    if (!capitalName) {
      return;
    }
    
    // Find capital city coordinates
    let capitalLat = null;
    let capitalLng = null;
    
    if (capitalName && country.cca2) {
      const capitalCity = cities.find(city => 
        city.name === capitalName && city.country === country.cca2
      );
      if (capitalCity) {
        capitalLat = capitalCity.lat;
        capitalLng = capitalCity.lng;
      }
    }
    
    lookup[name] = {
      lat: country.latlng[0],
      lng: country.latlng[1],
      code: country.cca2,
      region: country.region,
      capital: country.capital[0],
      capital_lat: capitalLat,
      capital_lng: capitalLng
    };
    
    // Add alternate names for better matching
    if (country.name.official !== name) {
      lookup[country.name.official] = lookup[name];
    }
  });

  console.log(lookup)
  
  return lookup;
};

const countryData = createCountryLookup();
const countryNames = Object.keys(countryData);

// Set up fuzzy search
const fuse = new Fuse(countryNames, { 
  threshold: 0.3,
  ignoreLocation: true,
  includeScore: true
});

// Distance calculation function
function calculateDistance(country1, country2) {
  const coords1 = countryData[country1];
  const coords2 = countryData[country2];
  
  if (!coords1 || !coords2) {
    console.warn(`Coordinates not found for ${country1} or ${country2}`);
    return null;
  }
  
  const distanceInMeters = getDistance(
    { latitude: coords1.lat, longitude: coords1.lng },
    { latitude: coords2.lat, longitude: coords2.lng }
  );
  
  return Math.round(distanceInMeters / 1000);
}

// Get random country for the game
function getRandomCountry() {
  const randomIndex = Math.floor(Math.random() * countryNames.length);
  const selectedCountry = countryNames[randomIndex];
  console.log('Random country selected:', selectedCountry);
  return selectedCountry;
}

// Get distance category for color coding
function getDistanceCategory(distance) {
  if (distance === 0) return 'correct';
  if (distance < 1000) return 'very-close';
  if (distance < 3000) return 'close';
  if (distance < 6000) return 'medium';
  if (distance < 10000) return 'far';
  return 'very-far';
}

async function getWeatherData(lat, long) {
  const params = {
    "latitude": lat,
    "longitude": long,
    "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset", "wind_speed_10m_max", "precipitation_hours", "precipitation_sum"]
  };
  const url = "https://api.open-meteo.com/v1/forecast";
  const responses = await fetchWeatherApi(url, params);

  // Process first location. Add a for-loop for multiple locations or weather models
  const response = responses[0];

  // Attributes for timezone and location
  const utcOffsetSeconds = response.utcOffsetSeconds();
  const timezone = response.timezone();
  const timezoneAbbreviation = response.timezoneAbbreviation();
  const latitude = response.latitude();
  const longitude = response.longitude();

  const daily = response.daily();

  const sunrise = daily.variables(3);
  const sunset = daily.variables(4);

  // Note: The order of weather variables in the URL query and the indices below need to match!
  const weatherData = {
    daily: {
      time: [...Array((Number(daily.timeEnd()) - Number(daily.time())) / daily.interval())].map(
        (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
      ),
      weatherCode: daily.variables(0).valuesArray(),
      temperature2mMax: daily.variables(1).valuesArray(),
      temperature2mMin: daily.variables(2).valuesArray(),
      sunrise: [...Array(sunrise.valuesInt64Length())].map(
        (_, i) => new Date((Number(sunrise.valuesInt64(i)) + utcOffsetSeconds) * 1000)
      ),
      sunset: [...Array(sunset.valuesInt64Length())].map(
        (_, i) => new Date((Number(sunset.valuesInt64(i)) + utcOffsetSeconds) * 1000)
      ),
      windSpeed10mMax: daily.variables(5).valuesArray(),
      precipitationHours: daily.variables(6).valuesArray(),
      precipitationSum: daily.variables(7).valuesArray(),
    },
  };

  // `weatherData` now contains a simple structure with arrays for datetime and weather data
  for (let i = 0; i < weatherData.daily.time.length; i++) {
    console.log(
      weatherData.daily.time[i].toISOString(),
      weatherData.daily.weatherCode[i],
      weatherData.daily.temperature2mMax[i],
      weatherData.daily.temperature2mMin[i],
      weatherData.daily.sunrise[i].toISOString(),
      weatherData.daily.sunset[i].toISOString(),
      weatherData.daily.windSpeed10mMax[i],
      weatherData.daily.precipitationHours[i],
      weatherData.daily.precipitationSum[i]
    );
  }

  return weatherData;
}

// GuessInput Component
function GuessInput({ onGuess, disabled }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    
    if (value.length > 1) {
      const results = fuse.search(value).slice(0, 5);
      setSuggestions(results.map(result => result.item));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (country = null) => {
    const guessCountry = country || input;
    
    if (!guessCountry.trim()) return;
    
    // Try exact match first, then fuzzy match
    let matchedCountry = guessCountry;
    if (!countryData[guessCountry]) {
      const fuzzyResult = fuse.search(guessCountry)[0];
      if (fuzzyResult && fuzzyResult.score < 0.3) {
        matchedCountry = fuzzyResult.item;
      } else {
        alert(`Country "${guessCountry}" not found. Try again!`);
        return;
      }
    }
    
    onGuess(matchedCountry);
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSuggestionClick = (country) => {
    handleSubmit(country);
  };

  return (
    <div className="guess-input-container">
      <div className="input-wrapper">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Enter a country name..."
          disabled={disabled}
          className="guess-input"
        />
        <button 
          onClick={() => handleSubmit()}
          disabled={disabled || !input.trim()}
          className="guess-button"
        >
          Guess
        </button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((country, index) => (
            <div
              key={index}
              className="suggestion"
              onClick={() => handleSuggestionClick(country)}
            >
              {country}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// GuessList Component
function GuessList({ guesses, isImperial }) {
  return (
    <div className="guess-list">
      <h3>Your Guesses ({guesses.length})</h3>
      {guesses.length === 0 ? (
        <p>No guesses yet. Start guessing!</p>
      ) : (
        <div className="guesses">
          {guesses.map((guess, index) => (
            <div 
              key={index} 
              className={`guess-item ${getDistanceCategory(guess.distance)}`}
            >
              <span className="country-name">{guess.country}</span>
              <span className="distance">
                {guess.distance === 0 ? '🎉 Correct!' : `${convertDistance(guess.distance, isImperial).toLocaleString()} ${isImperial ? 'miles' : 'km'}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// GameStats Component
function GameStats({ guesses, gameWon }) {
  return (
    <div className="game-stats">
      {gameWon && (
        <div className="win-message">
          <h2>🎉 Congratulations!</h2>
          <p>You found the country in {guesses.length} guesses!</p>
        </div>
      )}
    </div>
  );
}

// weather report component
function WeatherReport({ targetCountry, isImperial }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const country_info = countryData[targetCountry];
    
    if (country_info && country_info.capital_lat && country_info.capital_lng) {
      setLoading(true);
      getWeatherData(country_info.capital_lat, country_info.capital_lng)
        .then(data => {
          setWeatherData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching weather data:', error);
          setLoading(false);
        });
    }
  }, [targetCountry]);

  if (loading) {
    return <div>Loading weather data...</div>;
  }
  
  if (!weatherData) {
    return <div>Weather data not available</div>;
  }

  const tempUnit = isImperial ? '°F' : '°C';
  const distanceUnit = isImperial ? 'mph' : 'km/h';
  const precipUnit = isImperial ? 'in' : 'mm';

  return (
    <div>
      <h3>Weather Report</h3>
      <table>
        <th>Date</th>
        <th>Weather Description</th>
        <th>High</th>
        <th>Low</th>
        <th>Wind Speed</th>
        <th>Precipitation Total</th>
        <tbody>
          {weatherData.daily.time.map((date, index) => (
            <tr key={index}>
              <td>{date.toLocaleDateString()}</td>
              <td>{wmoCode(weatherData.daily.weatherCode[index]).description}</td>
              <td>{convertTemperature(weatherData.daily.temperature2mMax[index], isImperial)}{tempUnit}</td>
              <td>{convertTemperature(weatherData.daily.temperature2mMin[index], isImperial)}{tempUnit}</td>
              <td>{convertWindSpeed(weatherData.daily.windSpeed10mMax[index], isImperial)} {distanceUnit}</td>
              <td>{convertPrecipitation(weatherData.daily.precipitationSum[index], isImperial)} {precipUnit}</td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

// Unit conversion functions
const convertTemperature = (celsius, isImperial) => {
  if (isImperial) {
    return Math.round((celsius * 9/5) + 32);
  }
  return Math.round(celsius);
};

const convertDistance = (km, isImperial) => {
  if (isImperial) {
    return Math.round(km * 0.621371);
  }
  return km;
};

const convertWindSpeed = (kmh, isImperial) => {
  if (isImperial) {
    return Math.round(kmh * 0.621371);
  }
  return Math.round(kmh);
};

const convertPrecipitation = (mm, isImperial) => {
  if (isImperial) {
    return (mm * 0.0393701).toFixed(2);
  }
  return Math.round(mm);
};

// Main App Component
function App() {
  const [guesses, setGuesses] = useState([]);
  const [targetCountry, setTargetCountry] = useState(() => getRandomCountry());
  const [gameWon, setGameWon] = useState(false);
  const [isImperial, setIsImperial] = useState(false);

  const startNewGame = () => {
    console.log("starting new game")
    setTargetCountry(getRandomCountry());
    setGuesses([]);
    setGameWon(false);
  };

  const handleGuess = (country) => {
    // Prevent duplicate guesses
    if (guesses.some(guess => guess.country === country)) {
      alert('You already guessed that country!');
      return;
    }

    const distance = calculateDistance(country, targetCountry);
    const newGuess = {
      country,
      distance
    };
    
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    
    if (distance === 0) {
      setGameWon(true);
    }
  };

  const toggleUnits = () => {
    setIsImperial(!isImperial);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌍 Location Guessing Game</h1>
        <p>Guess the mystery country! You'll get distance hints.</p>
        <button onClick={toggleUnits} className="units-toggle">
          {isImperial ? 'Switch to Metric' : 'Switch to Imperial'}
        </button>
      </header>

      <main className="game-container">
        <WeatherReport targetCountry={targetCountry} isImperial={isImperial} />

        <GameStats guesses={guesses} gameWon={gameWon} />
        
        {!gameWon && (
          <GuessInput onGuess={handleGuess} disabled={gameWon} />
        )}
        
        <GuessList guesses={guesses} isImperial={isImperial} />
        
        {gameWon && (
          <div className="new-game-section">
            <button onClick={startNewGame} className="new-game-button">
              Play Again
            </button>
            <p className="answer">The country was: <strong>{targetCountry}</strong></p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
