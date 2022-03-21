import { render, screen } from "@testing-library/react";
import App from "./App";
import { debugTest } from "testing-library-visualizer";

debugTest("renders learn react link", async () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
