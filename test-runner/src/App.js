import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [command, setCommand] = useState();
  const [innerHTML, setInnerHTML] = useState(null);
  const [cssFiles, setCssFiles] = useState([]);
  useEffect(() => {
    axios.get("/load").then((response) => {
      setInnerHTML(response.data.html);
      setCssFiles(response.data.cssFiles);
    });
  }, []);

  return (
    <div className="container">
      {cssFiles.map((file) => (
        <link rel="stylesheet" type="text/css" href={file} />
      ))}
      <div className="app" dangerouslySetInnerHTML={{ __html: innerHTML }} />
      <div className="console">
        <input onChange={(event) => setCommand(event.value)} value={command} />
      </div>
    </div>
  );
}

export default App;
