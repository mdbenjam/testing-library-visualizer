import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import CommandInput from "./CommandInput";
import { IFrame } from "./IFrame";
function App() {
  const [innerHTML, setInnerHTML] = useState(null);

  useEffect(() => {
    axios.get("/load").then((response) => {
      setInnerHTML(response.data.html);
    });
  }, []);

  return (
    <div className="container">
      <div className="console">
        <CommandInput setInnerHTML={setInnerHTML} />
        <button onClick={() => axios.post("/stop")}>Stop Test</button>
      </div>
      <IFrame className="app">{innerHTML}</IFrame>
    </div>
  );
}

export default App;
