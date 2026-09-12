import { Routes, Route } from 'react-router-dom';

import HomePage from "./Pages/HomePage/HomePage";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
        </Routes>
    )
}