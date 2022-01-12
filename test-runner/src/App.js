import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import CommandInput from "./CommandInput";

function App() {
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
      <div className="console">
        <CommandInput setInnerHTML={setInnerHTML} />
      </div>
      {cssFiles.map((file) => (
        <link key={file} rel="stylesheet" type="text/css" href={file} />
      ))}
      <div className="app" dangerouslySetInnerHTML={{ __html: innerHTML }} />
    </div>
  );
}

export default App;
