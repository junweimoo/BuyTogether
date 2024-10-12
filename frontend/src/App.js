import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import LoginPage from "./pages/LoginPage";

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomID" element={<RoomPage />} />
          <Route path="/login" element={<LoginPage />}/>
        </Routes>
      </Router>
  );
}

export default App;
