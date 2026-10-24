import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import Curtain from './components/Curtain.jsx';
import CursorLabel from './components/CursorLabel.jsx';
import { scrollToTop, startSmoothScroll, stopSmoothScroll } from './lib/motion.js';

// The CMS is only ever loaded by one person, but it was bundled into the single
// script every visitor downloads and parses before the page could even ask the
// API for its content — which is what the photos are waiting on. Splitting it
// out keeps the admin code off the public critical path.
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));

// A new page starts at its top, the way a normal link would. The public
// site scrolls through Lenis; the CMS keeps the browser's own scrolling.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/bellacasa-cms')) stopSmoothScroll();
    else startSmoothScroll();
    scrollToTop();
  }, [pathname]);
  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Curtain />
      <CursorLabel />
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
    </>
  );
}

export default App;
