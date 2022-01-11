import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";

function App() {
  const [command, setCommand] = useState();
  const [innerHTML, setInnerHTML] = useState(null);
  const [cssFiles, setCssFiles] = useState([]);
  const onSubmit = (event) => {
    axios.post("/command", { command }).then((response) => {
      setInnerHTML(response.data.html);
    });
    event.preventDefault();
  };
  useEffect(() => {
    axios.get("/load").then((response) => {
      setInnerHTML(response.data.html);
      setCssFiles(response.data.cssFiles);
    });
  }, []);

  return (
    <div className="container">
      {cssFiles.map((file) => (
        <link key={file} rel="stylesheet" type="text/css" href={file} />
      ))}
      <div className="app" dangerouslySetInnerHTML={{ __html: innerHTML }} />
      <div className="console">
        <form onSubmit={onSubmit}>
          <input
            onChange={(event) => setCommand(event.target.value)}
            value={command}
          />
        </form>
      </div>
    </div>
  );
}

export default App;
