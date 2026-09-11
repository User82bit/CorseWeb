import { Routes, Route } from 'react-router-dom';

import HomePage from "./Pages/HomePage/HomePage";
import HomeCoursePage from "./Pages/HomePage/CoursesPage/HomeCoursePage";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/#courses" element={<HomeCoursePage />} />
        </Routes>
    )
}