import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import CommandInput from "./CommandInput";
import { IFrame } from "./IFrame";
function App() {
  const [innerHTML, setInnerHTML] = useState(null);
  const [availableCommands, setAvailableCommands] = useState();

  useEffect(() => {
    axios.get("/load").then((response) => {
      setInnerHTML(response.data.html);
      setAvailableCommands(response.data.availableCommands);
    });
  }, []);

  return (
    <div className="container">
      <div className="console">
        <CommandInput
          availableCommands={availableCommands}
          setInnerHTML={setInnerHTML}
        />
        <button onClick={() => axios.post("/stop")}>Stop Test</button>
        <button
          onClick={() =>
            axios.post("/reset").then((response) => {
              setInnerHTML(response.data.html);
            })
          }
        >
          Reset Test
        </button>
      </div>
      <IFrame className="app">{innerHTML}</IFrame>
    </div>
  );
}

export default App;
