import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/home" element={<h1>User Home</h1>} />

        <Route path="/admin-dashboard" element={<h1>Admin Dashboard</h1>} />

        <Route path="/manager-dashboard" element={<h1>Branch Manager Dashboard</h1>} />

        <Route path="/document-dashboard" element={<h1>Document Handler Dashboard</h1>} />

      </Routes>

    </BrowserRouter>

  );
}

export default App;