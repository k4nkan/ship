import { Route, Routes } from "react-router-dom";
import { MapPage } from "./routes/MapPage";
import { PostPage } from "./routes/PostPage";
import { ResultPage } from "./routes/ResultPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/post" element={<PostPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
