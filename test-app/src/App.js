import { useState } from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  const [counter, setCounter] = useState(0);
  const [delayedUpdate, setDelayedUpdate] = useState("incomplete");
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
      <div>Counter: {counter}</div>
      <button onClick={() => setCounter(counter + 1)}>Increment counter</button>
      <div className="test-style">Delayed update: {delayedUpdate}</div>
      <button
        onClick={() =>
          setTimeout(() => {
            setDelayedUpdate("complete");
          }, 1000)
        }
      >
        Trigger delayed update
      </button>
    </div>
  );
}

export default App;
