import { Routes, Route } from "react-router-dom";
import HomePage from "./Pages/HomePage/HomePage";
import CoursesPage from "./Pages/CoursesPage/CoursesPage";
import CourseDetailPage from "./Pages/CourseDetailPage/CourseDetailPage";
import AppLayout from "./Pages/AppLayout/AppLayout";
import AppDashboard from "./Pages/AppDashboard/AppDashboard";
import AppMyCourses from "./Pages/AppMyCourses/AppMyCourses";
import AppCourseDetailPage from "./Pages/AppCourseDetailPage/AppCourseDetailPage";
import AppLessonPage from "./Pages/AppLessonPage/AppLessonPage";
import AdminLayout from "./Pages/AdminLayout/AdminLayout";
import AdminDashboard from "./Pages/AdminDashboard/AdminDashboard";
import AdminCoursesPage from "./Pages/AdminCoursesPage/AdminCoursesPage";
import AdminCourseEditor from "./Pages/AdminCourseEditor/AdminCourseEditor";
import LessonEditorPage from "./Pages/AdminCourseEditor/LessonEditorPage";
import NotFound from "./Pages/NotFound/NotFound";
import LoginPage from "./Pages/Login/LoginPage";
import { RequireAuth, RequireAdmin } from "./components/AuthGuard";

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<HomePage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:courseSlug" element={<CourseDetailPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Aluno — exige login */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/app" element={<AppDashboard />} />
        <Route path="/app/courses" element={<AppMyCourses />} />
        <Route path="/app/courses/:courseSlug" element={<AppCourseDetailPage />} />
        <Route path="/app/courses/:courseSlug/lessons/:lessonSlug" element={<AppLessonPage />} />
      </Route>

      {/* Editor visual do curso: workspace integral, sem o shell administrativo. */}
      <Route path="/admin/courses/:courseSlug/editor" element={<RequireAdmin><LessonEditorPage /></RequireAdmin>} />

      {/* Admin — exige login + role admin (definido no servidor via AdminEmails) */}
      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCoursesPage />} />
        <Route path="/admin/courses/new" element={<AdminCourseEditor />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
