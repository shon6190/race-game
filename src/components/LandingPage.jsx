import { useEffect, useState } from 'react';

const USERS_STORAGE_KEY = 'traffic_rush_users';
const LAST_USER_STORAGE_KEY = 'traffic_rush_last_user';

function readStoredUsers() {
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((name) => typeof name === 'string' && name.trim().length > 0);
  } catch (error) {
    console.error('Failed to read stored users:', error);
    return [];
  }
}

function writeStoredUsers(users) {
  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users:', error);
  }
}

export function LandingPage({ onStart }) {
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [inputValue, setInputValue] = useState(() => window.localStorage.getItem(LAST_USER_STORAGE_KEY) || '');
  const [autocompleteList, setAutocompleteList] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    setError('');

    if (!value.trim()) {
      setAutocompleteList([]);
      return;
    }

    const query = value.trim().toLowerCase();
    const users = readStoredUsers();
    const matches = users.filter((name) => name.toLowerCase().includes(query)).slice(0, 8);
    setAutocompleteList(matches);
  };

  const handleAutocompleteSelect = (name) => {
    setInputValue(name);
    setAutocompleteList([]);
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const riderName = inputValue.trim();
    if (!riderName) {
      setError('Please enter a rider name.');
      return;
    }

    const existingUsers = readStoredUsers();
    const nextUsers = [
      riderName,
      ...existingUsers.filter((name) => name.toLowerCase() !== riderName.toLowerCase()),
    ].slice(0, 100);
    writeStoredUsers(nextUsers);
    window.localStorage.setItem(LAST_USER_STORAGE_KEY, riderName);

    setError('');
    setAutocompleteList([]);
    onStart(riderName);
  };

  if (showSplash) {
    return (
      <div className="splash-screen">
        <img src="\cover_image.png" alt="Traffic Rush Splash" className="splash-image" />
      </div>
    );
  }

  return (
    <>
      <video className="bg" autoPlay loop muted playsInline>
        <source src="/video.mp4" type="video/mp4" />
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
                  {autocompleteList.map((name, index) => {
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

            {error ? <p id="error" className="error-text">{error}</p> : null}
            <button type="submit" className="login-btn">Start Ride</button>
          </form>
        </div>
      </div>
    </>
  );
}
