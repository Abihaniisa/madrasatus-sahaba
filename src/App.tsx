import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./ui/Shell";
import Home from "./pages/Home";
import Curriculum from "./pages/Curriculum";
import Materials from "./pages/Materials";
import Login from "./pages/Login";
import Builder from "./pages/Builder";
import StudentPortal from "./pages/StudentPortal";
import Landing from "./pages/admin/Landing";
import ClassPage from "./pages/admin/ClassPage";
import StudentPage from "./pages/admin/StudentPage";
import StudentForm from "./pages/admin/StudentForm";
import { ReportPage } from "./pages/admin/Reports";
import Fees from "./pages/admin/Fees";
import FeesStudent from "./pages/admin/FeesStudent";
import FeesPrint from "./pages/admin/FeesPrint";
import Content from "./pages/admin/Content";
import Access from "./pages/admin/Access";
import Promotion from "./pages/admin/Promotion";
import Daura from "./pages/admin/Daura";
import DauraProgrammePage from "./pages/admin/DauraProgramme";
import DauraAssessmentSheetPage from "./pages/admin/DauraAssessmentSheetPage";
import Manage from "./pages/admin/Manage";
import Settings from "./pages/admin/Settings";
import GraduatedYear from "./pages/admin/GraduatedYear";
import Assessments from "./pages/admin/Assessments";
import AssessmentSheetPage from "./pages/admin/AssessmentSheetPage";
import ResultSheetPage from "./pages/admin/ResultSheetPage";
import Records from "./pages/admin/Records";
import BulkPrint from "./pages/admin/BulkPrint";
import EditMarks from "./pages/admin/EditMarks";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/curriculum" element={<Curriculum />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/login" element={<Login />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/me" element={<StudentPortal />} />

        <Route path="/admin" element={<Landing />} />
        <Route path="/admin/class/:cls" element={<ClassPage />} />
        <Route path="/admin/student/new" element={<StudentForm />} />
        <Route path="/admin/student/:id" element={<StudentPage />} />
        <Route path="/admin/student/:id/edit" element={<StudentForm />} />
        <Route path="/admin/student/:id/records" element={<Records />} />
        <Route path="/admin/student/:id/marks" element={<EditMarks />} />
        <Route path="/admin/bulk" element={<BulkPrint />} />
        <Route path="/admin/report/:id" element={<ReportPage />} />
        <Route path="/admin/fees" element={<Fees />} />
        <Route path="/admin/fees/student/:id" element={<FeesStudent />} />
        <Route path="/admin/fees/print" element={<FeesPrint />} />
        <Route path="/admin/content" element={<Content />} />
        <Route path="/admin/access" element={<Access />} />
        <Route path="/admin/promotion" element={<Promotion />} />
        <Route path="/admin/manage" element={<Manage />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/assessments" element={<Assessments />} />
        <Route path="/admin/assessment-sheet" element={<AssessmentSheetPage />} />
        <Route path="/admin/result-sheet" element={<ResultSheetPage />} />
        <Route path="/admin/graduated/:section/:year" element={<GraduatedYear />} />
        <Route path="/admin/daura" element={<Daura />} />
        <Route path="/admin/daura/:id" element={<DauraProgrammePage />} />
        <Route path="/admin/daura/:id/assessment-sheet" element={<DauraAssessmentSheetPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
