import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import CommandInput from "./CommandInput";
import { IFrame } from "./IFrame";
function App() {
  const [innerHTML, setInnerHTML] = useState(null);
  const [availableCommands, setAvailableCommands] = useState();
  const [errorState, setErrorState] = useState(null);

  useEffect(() => {
    axios
      .get("/load")
      .then((response) => {
        setInnerHTML(response.data.html);
        setAvailableCommands(response.data.availableCommands);
      })
      .catch((err) => {
        setErrorState({
          title: "Could not request data from server.",
          message: err,
        });
      });
  }, []);

  if (errorState) {
    return (
      <div className="container">
        <h1>{errorState.title}</h1>
        <p>{errorState.message.toString()}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="console">
        <CommandInput
          availableCommands={availableCommands}
          setInnerHTML={setInnerHTML}
        />
        <button onClick={() => axios.post("/stop")}>Stop Test</button>
      </div>
      <IFrame className="app">{innerHTML}</IFrame>
    </div>
  );
}

export default App;
