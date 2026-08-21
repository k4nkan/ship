import { Route, Routes } from "react-router-dom";
import { MapPage } from "./routes/MapPage";
import { AdminPage } from "./routes/AdminPage";
import { TeamPage } from "./routes/TeamPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/teams/:teamId" element={<TeamPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
