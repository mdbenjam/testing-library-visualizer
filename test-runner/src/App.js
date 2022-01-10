import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [command, setCommand] = useState();
  const [innerHTML, setInnerHTML] = useState();
  useEffect(() => {
    axios.get("/initial_html").then((response) => {
      setInnerHTML(response.data);
    });
  });

  return (
    <div className="container">
      <link rel="stylesheet" type="text/css" href="/styling" />
      <div className="app" dangerouslySetInnerHTML={{ __html: innerHTML }} />
      <div className="console">
        <input onChange={(event) => setCommand(event.value)} value={command} />
      </div>
    </div>
  );
}

export default App;
