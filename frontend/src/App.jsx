import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Admin from "./Admin";

function Home() {
  if (!sessionStorage.getItem("token")) return <Navigate to="/login" />;
  return sessionStorage.getItem("role") === "ADMIN" ? <Admin /> : <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}