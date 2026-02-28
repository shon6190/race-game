import { useEffect, useMemo, useState } from 'react';

export function LandingPage({ onStart }) {
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [autocompleteList, setAutocompleteList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const apiBaseUrl = useMemo(() => '/api/users', []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = async (event) => {
    const value = event.target.value;
    setInputValue(value);
    setError('');

    if (!value.trim()) {
      setAutocompleteList([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/search?username=${encodeURIComponent(value)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        setAutocompleteList([]);
        return;
      }

      const data = await response.json();
      const users = Array.isArray(data) ? data : data.users || [];
      setAutocompleteList(users);
    } catch (fetchError) {
      console.error('Autocomplete error:', fetchError);
      setAutocompleteList([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAutocompleteSelect = (name) => {
    setInputValue(name);
    setAutocompleteList([]);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const riderName = inputValue.trim();
    if (!riderName) {
      setError('Please enter a rider name.');
      return;
    }

    try {
      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: riderName }),
      });

      if (!response.ok) {
        throw new Error('Failed to register rider with the backend');
      }
    } catch (loginError) {
      console.error(loginError);
      setError('Error connecting to the game server. Please try again.');
      return;
    }

    setError('');
    onStart(riderName);
  };

  if (showSplash) {
    return (
      <div className="splash-screen">
        <img src="/splash.jpg" alt="Traffic Rush Splash" className="splash-image" />
      </div>
    );
  }

  return (
    <>
      <video className="bg" autoPlay loop muted playsInline>
        <source src="/Bike_Race_Game_Login_Background_GIF.mp4" type="video/mp4" />
      </video>

      <div className="overlay-dark" />

      <div className="login-container">
        <div className="login-box">
          <h1 className="game-title">Traffic Rush</h1>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <input
                type="text"
                id="username"
                name="username"
                className="input-field"
                placeholder="Rider_Name_01"
                required
                autoComplete="off"
                autoFocus
                value={inputValue}
                onChange={handleInputChange}
              />

              {autocompleteList.length > 0 ? (
                <ul className="autocomplete-dropdown">
                  {autocompleteList.map((item, index) => {
                    const name = item.username || item;
                    return (
                      <li
                        key={`${name}-${index}`}
                        onMouseDown={() => handleAutocompleteSelect(name)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            handleAutocompleteSelect(name);
                          }
                        }}
                      >
                        {name}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            {isSearching ? <p className="search-hint">Searching riders...</p> : null}
            {error ? <p id="error" className="error-text">{error}</p> : null}
            <button type="submit" className="login-btn">Start Ride</button>
          </form>
        </div>
      </div>
    </>
  );
}
