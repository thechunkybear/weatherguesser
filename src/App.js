// App.js
import React, { useState, useEffect } from 'react';
import countries from 'world-countries';
import { getDistance } from 'geolib';
import Fuse from 'fuse.js';
import './App.css';

// Create country lookup object
const createCountryLookup = () => {
  const lookup = {};
  
  countries.forEach(country => {
    const name = country.name.common;
    lookup[name] = {
      lat: country.latlng[0],
      lng: country.latlng[1],
      code: country.cca2,
      region: country.region
    };
    
    // Add alternate names for better matching
    if (country.name.official !== name) {
      lookup[country.name.official] = lookup[name];
    }
  });
  
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
function GuessList({ guesses }) {
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
                {guess.distance === 0 ? '🎉 Correct!' : `${guess.distance.toLocaleString()} km`}
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

// Main App Component
function App() {
  const [guesses, setGuesses] = useState([]);
  const [targetCountry, setTargetCountry] = useState(() => getRandomCountry());
  const [gameWon, setGameWon] = useState(false);

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

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌍 Location Guessing Game</h1>
        <p>Guess the mystery country! You'll get distance hints.</p>
      </header>

      <main className="game-container">
        <GameStats guesses={guesses} gameWon={gameWon} />
        
        {!gameWon && (
          <GuessInput onGuess={handleGuess} disabled={gameWon} />
        )}
        
        <GuessList guesses={guesses} />
        
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
