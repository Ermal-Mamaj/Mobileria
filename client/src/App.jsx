import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';

// The CMS is only ever loaded by one person, but it was bundled into the single
// script every visitor downloads and parses before the page could even ask the
// API for its content — which is what the photos are waiting on. Splitting it
// out keeps the admin code off the public critical path.
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/rooms/:slug" element={<RoomPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/bellacasa-cms/login"
        element={
          <Suspense fallback={null}>
            <AdminLogin />
          </Suspense>
        }
      />
      <Route
        path="/bellacasa-cms/*"
        element={
          <Suspense fallback={null}>
            <AdminDashboard />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default App;
